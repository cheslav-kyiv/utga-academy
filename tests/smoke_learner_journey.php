<?php
// Наскрізний тест шляху слухача: запис → послідовні модулі → тест → анкета → сертифікат → завершення курсу → бейдж.
//
// ЛИШЕ для локального / тестового (staging) Moodle: створює тестового користувача.
//   php -d max_input_vars=5000 tests/smoke_learner_journey.php --moodle=/шлях/до/moodle --course=UTGA-G01 [--pdf=/tmp/cert.pdf]
//       [--password=...]  — задати пароль тестовому слухачу (для tests/a11y)
//
// Код виходу 0 — усі перевірки пройдено; 1 — є провали.

define('CLI_SCRIPT', true);
$opts = getopt('', ['moodle:', 'course:', 'pdf:', 'password:']);
if (empty($opts['moodle']) || empty($opts['course'])) {
    fwrite(STDERR, "Використання: php smoke_learner_journey.php --moodle=/шлях --course=SHORTNAME [--pdf=файл]\n");
    exit(1);
}
require(rtrim($opts['moodle'], '/') . '/config.php');
global $CFG, $DB;
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once($CFG->dirroot . '/mod/feedback/lib.php');
require_once($CFG->libdir . '/badgeslib.php');
require_once($CFG->dirroot . '/lib/phpunit/classes/util.php');

$failures = 0;
function check(bool $ok, string $msg): void {
    global $failures;
    mtrace(($ok ? '  ✔ ' : '  ✘ ') . $msg);
    if (!$ok) {
        $failures++;
    }
}

\core\session\manager::set_user(get_admin());
$gen = phpunit_util::get_data_generator();
$course = $DB->get_record('course', ['shortname' => $opts['course']], '*', MUST_EXIST);
$user = $gen->create_user(['firstname' => 'Олена', 'lastname' => 'Перевірна-' . random_string(4),
    'email' => 'smoke+' . time() . '@example.com'] + (!empty($opts['password']) ? ['password' => $opts['password']] : []));
$gen->enrol_user($user->id, $course->id, 'student', 'self');
mtrace("Курс {$course->shortname} (id {$course->id}), тестовий слухач {$user->username} (id {$user->id})");

$modinfo = get_fast_modinfo($course, $user->id);
$completion = new completion_info($course);
$pages = [];
foreach ($modinfo->get_cms() as $cm) {
    if ($cm->modname === 'page') {
        $pages[] = $cm;
    }
}
$quizcm = current(array_filter($modinfo->get_cms(), fn($cm) => $cm->modname === 'quiz'));
$feedbackcm = current(array_filter($modinfo->get_cms(), fn($cm) => $cm->modname === 'feedback'));
$certcm = current(array_filter($modinfo->get_cms(), fn($cm) => $cm->modname === 'customcert'));

// 1. Послідовне відкриття модулів.
$secondmodulefirst = current(array_filter($pages, fn($cm) => $cm->sectionnum == 2));
check(!$secondmodulefirst->uservisible, 'Модуль 2 закритий до опрацювання модуля 1');
check(!$certcm->uservisible, 'Сертифікат закритий на старті');

\core\session\manager::set_user($user);
foreach ($pages as $cm) {
    $completion->set_module_viewed($cm, $user->id);
}
\core\session\manager::set_user(get_admin());
get_fast_modinfo($course, $user->id, true);
$modinfo = get_fast_modinfo($course, $user->id);
check($modinfo->get_cm($secondmodulefirst->id)->uservisible, 'Модуль 2 відкрився після опрацювання модуля 1');
check($modinfo->get_cm($quizcm->id)->uservisible, 'Підсумковий тест відкрився після всіх модулів');
check(!$modinfo->get_cm($certcm->id)->uservisible, 'Сертифікат ще закритий (немає тесту й анкети)');

// 2. Тест: одна невдала спроба (0 балів), потім успішна.
\core\session\manager::set_user($user);
$quizobj = \mod_quiz\quiz_settings::create($quizcm->instance, $user->id);
$attemptwithanswers = function(bool $correct) use ($quizobj, $user) {
    $attempts = quiz_get_user_attempts($quizobj->get_quizid(), $user->id, 'all');
    $attempt = quiz_prepare_and_start_new_attempt($quizobj, count($attempts) + 1, end($attempts) ?: null,
        false, [], [], $user->id);
    $attemptobj = \mod_quiz\quiz_attempt::create($attempt->id);
    $responses = [];
    foreach ($attemptobj->get_slots() as $slot) {
        // Імітовані відповіді передаються текстом варіанту (як у Behat-тестах Moodle).
        foreach ($attemptobj->get_question_attempt($slot)->get_question()->answers as $answer) {
            if (($answer->fraction > 0.99) === $correct) {
                $responses[$slot] = ['answer' => $answer->answer];
                break;
            }
        }
    }
    $attemptobj->process_submitted_actions(time(), false, $responses);
    $attemptobj->process_finish(time(), false);
    return \mod_quiz\quiz_attempt::create($attempt->id)->get_sum_marks();
};
$bad = $attemptwithanswers(false);
\core\session\manager::set_user(get_admin());
get_fast_modinfo($course, $user->id, true);
$modinfo = get_fast_modinfo($course, $user->id);
check(!$modinfo->get_cm($feedbackcm->id)->uservisible, "Після невдалої спроби ({$bad} б.) анкета закрита");

\core\session\manager::set_user($user);
$good = $attemptwithanswers(true);
\core\session\manager::set_user(get_admin());
$state = $completion->get_data($quizcm, false, $user->id)->completionstate;
check(in_array($state, [COMPLETION_COMPLETE_PASS, COMPLETION_COMPLETE]), "Тест зараховано після успішної спроби ({$good} б.)");

// 3. Анкета зворотного зв'язку.
\core\session\manager::set_user($user);
$feedback = $DB->get_record('feedback', ['id' => $feedbackcm->instance]);
$fc = new mod_feedback_completion($feedback, get_coursemodule_from_id('feedback', $feedbackcm->id), $course->id,
    false, null, null, $user->id);
$answers = [];
foreach ($DB->get_records('feedback_item', ['feedback' => $feedback->id]) as $item) {
    $answers["{$item->typ}_{$item->id}"] = $item->typ === 'multichoice' ? '1' : 'Тестова відповідь';
}
$fc->set_module_viewed();
$fc->save_response_tmp((object)$answers);
$fc->save_response();
\core\session\manager::set_user(get_admin());
get_fast_modinfo($course, $user->id, true);
$modinfo = get_fast_modinfo($course, $user->id);
check($modinfo->get_cm($certcm->id)->uservisible, 'Сертифікат відкрився після тесту й анкети');

// 4. Видача сертифіката (як при першому перегляді) і PDF.
$code = \mod_customcert\certificate::issue_certificate($certcm->instance, $user->id);
$issue = $DB->get_record('customcert_issues', ['id' => $code]);
check(!empty($issue->code), "Сертифікат видано, код перевірки: {$issue->code}");
\core\session\manager::set_user($user);
$completion->set_module_viewed($modinfo->get_cm($certcm->id), $user->id);
\core\session\manager::set_user(get_admin());
if (!empty($opts['pdf'])) {
    $cert = $DB->get_record('customcert', ['id' => $certcm->instance]);
    $template = new \mod_customcert\template($DB->get_record('customcert_templates', ['id' => $cert->templateid]));
    file_put_contents($opts['pdf'], $template->generate_pdf(false, $user->id, true));
    check(filesize($opts['pdf']) > 1000, "PDF збережено: {$opts['pdf']}");
}

// 5. Завершення курсу і бейдж.
$cc = new completion_completion(['userid' => $user->id, 'course' => $course->id]);
$completion = new completion_info($course);
check($completion->is_course_complete($user->id) || (function() use ($course, $user) {
    // Агрегація завершення курсу виконується cron-задачею; запускаємо її вручну.
    ob_start();
    (new \core\task\completion_regular_task())->execute();
    ob_end_clean();
    return (new completion_info($course))->is_course_complete($user->id);
})(), 'Курс позначено завершеним');

$badge = $DB->get_record('badge', ['courseid' => $course->id], '*', MUST_EXIST);
$issued = $DB->get_record('badge_issued', ['badgeid' => $badge->id, 'userid' => $user->id]);
check((bool)$issued, 'Бейдж видано автоматично');

mtrace('');
mtrace('Перевірка онлайн:');
mtrace("  сертифікат: {$CFG->wwwroot}/mod/customcert/verify_certificate.php?code=" . ($issue->code ?? ''));
if ($issued) {
    mtrace("  бейдж:      {$CFG->wwwroot}/badges/badge.php?hash={$issued->uniquehash}");
    mtrace("  OB 2.0 JSON: {$CFG->wwwroot}/badges/assertion.php?b={$issued->uniquehash}&obversion=2");
}
mtrace('');
mtrace($failures ? "ПРОВАЛІВ: {$failures}" : 'Усі перевірки пройдено.');
exit($failures ? 1 : 0);
