<?php
// Академія ГС «ВАГ» — скрипт налаштування Moodle та збирання курсів з описів у courses/*/course.json.
//
// Запуск (з будь-якої теки):
//   php -d max_input_vars=5000 provisioning/provision.php --moodle=/шлях/до/moodle [--rebuild] [--only=UTGA-G01]
//
// Повторний запуск безпечний: курси, які вже існують, пропускаються (або перезбираються з --rebuild).
// Скрипт використовує генератор даних Moodle так само, як стандартний admin/tool/generator.

define('CLI_SCRIPT', true);

$opts = getopt('', ['moodle:', 'rebuild', 'only:', 'skip-site', 'help']);
if (isset($opts['help']) || empty($opts['moodle'])) {
    fwrite(STDOUT, "Використання: php provision.php --moodle=/шлях/до/moodle [--rebuild] [--only=SHORTNAME] [--skip-site]\n");
    exit(empty($opts['moodle']) ? 1 : 0);
}

$repo = dirname(__DIR__);
require(rtrim($opts['moodle'], '/') . '/config.php');

global $CFG, $DB, $USER;
require_once($CFG->libdir . '/clilib.php');
require_once($CFG->dirroot . '/course/lib.php');
require_once($CFG->dirroot . '/course/modlib.php');
require_once($CFG->libdir . '/completionlib.php');
require_once($CFG->dirroot . '/completion/criteria/completion_criteria_activity.php');
require_once($CFG->libdir . '/badgeslib.php');
require_once($CFG->dirroot . '/badges/lib/awardlib.php');
require_once($CFG->dirroot . '/mod/quiz/locallib.php');
require_once($CFG->dirroot . '/question/format.php');
require_once($CFG->dirroot . '/question/format/gift/format.php');
require_once($CFG->dirroot . '/user/profile/lib.php');
require_once($CFG->dirroot . '/user/profile/definelib.php');
require_once($CFG->dirroot . '/user/profile/field/menu/define.class.php');
require_once($CFG->dirroot . '/lib/phpunit/classes/util.php');

\core\session\manager::set_user(get_admin());

$site = json_decode(file_get_contents($repo . '/config/site.json'), true, 512, JSON_THROW_ON_ERROR);
$gen = phpunit_util::get_data_generator();

if (!isset($opts['skip-site'])) {
    utga_apply_site_settings($site);
    utga_ensure_profile_field($site['profile_field']);
}
$categories = utga_ensure_categories($site['categories']);

foreach (glob($repo . '/courses/*/course.json') as $file) {
    $spec = json_decode(file_get_contents($file), true, 512, JSON_THROW_ON_ERROR);
    if (!empty($opts['only']) && $opts['only'] !== $spec['shortname']) {
        continue;
    }
    utga_build_course($gen, $spec, dirname($file), $site, $categories, isset($opts['rebuild']));
}
mtrace('Готово.');

// ---------------------------------------------------------------------------------------------------------------------

/** Налаштування сайту: мова, часовий пояс, завершення, умови доступу, бейджі, перевірка сертифікатів. */
function utga_apply_site_settings(array $site): void {
    global $DB;
    $s = $site['site'];

    $sitecourse = get_site();
    $DB->update_record('course', (object)['id' => $sitecourse->id, 'fullname' => $s['fullname'], 'shortname' => $s['shortname']]);

    foreach (['timezone', 'country', 'enablecompletion', 'enableavailability', 'enablebadges'] as $name) {
        set_config($name === 'timezone' ? 'timezone' : $name, $s[$name]);
    }
    set_config('forcetimezone', $s['timezone']);

    // Українська мова інтерфейсу. Потрібен доступ до download.moodle.org.
    if (!get_string_manager()->translation_exists($s['lang'], false)) {
        try {
            $controller = new \tool_langimport\controller();
            $controller->install_languagepacks($s['lang']);
            mtrace("Мовний пакет '{$s['lang']}' встановлено.");
        } catch (\Throwable $e) {
            mtrace("УВАГА: не вдалося встановити мовний пакет '{$s['lang']}': " . $e->getMessage());
            mtrace("       Встановіть вручну: Адміністрування > Мова > Мовні пакети.");
        }
    }
    if (get_string_manager()->translation_exists($s['lang'], false)) {
        set_config('lang', $s['lang']);
    }

    $b = $site['badges'];
    set_config('badges_defaultissuername', $b['issuer_name']);
    set_config('badges_defaultissuercontact', $b['issuer_contact']);

    // Публічна перевірка будь-якого сертифіката за кодом: /mod/customcert/verify_certificate.php
    set_config('verifyallcertificates', $site['certificates']['verify_all_certificates'], 'customcert');
    set_config('verifyany', 1, 'customcert');

    // Самостійний запис на курси (новим курсам — увімкнено).
    set_config('status', ENROL_INSTANCE_ENABLED, 'enrol_self');
    $enabled = explode(',', get_config('core', 'enrol_plugins_enabled'));
    if (!in_array('self', $enabled)) {
        $enabled[] = 'self';
        set_config('enrol_plugins_enabled', implode(',', $enabled));
    }

    purge_caches();
    mtrace('Налаштування сайту застосовано.');
}

/** Поле профілю «Категорія слухача» — для звітів та умовного доступу (availability_profile). */
function utga_ensure_profile_field(array $f): void {
    global $DB;
    if ($DB->record_exists('user_info_field', ['shortname' => $f['shortname']])) {
        return;
    }
    $category = $DB->get_record('user_info_category', [], '*', IGNORE_MULTIPLE);
    if (!$category) {
        $category = (object)['name' => 'Інше', 'sortorder' => 1];
        $category->id = $DB->insert_record('user_info_category', $category);
    }
    $data = (object)[
        'shortname' => $f['shortname'],
        'name' => $f['name'],
        'datatype' => 'menu',
        'description' => '',
        'descriptionformat' => FORMAT_HTML,
        'categoryid' => $category->id,
        'required' => 0,
        'locked' => 0,
        'visible' => PROFILE_VISIBLE_ALL,
        'forceunique' => 0,
        'signup' => 1,
        'defaultdata' => '',
        'defaultdataformat' => FORMAT_PLAIN,
        'param1' => implode("\n", $f['options']),
    ];
    (new profile_define_menu())->define_save($data);
    mtrace("Поле профілю «{$f['name']}» створено.");
}

/** Категорії курсів, повертає [idnumber => id]. */
function utga_ensure_categories(array $cats): array {
    global $DB;
    $map = [];
    foreach ($cats as $c) {
        $id = $DB->get_field('course_categories', 'id', ['idnumber' => $c['idnumber']]);
        if (!$id) {
            $id = core_course_category::create([
                'name' => $c['name'],
                'idnumber' => $c['idnumber'],
                'description' => $c['description'],
                'descriptionformat' => FORMAT_HTML,
            ])->id;
            mtrace("Категорію «{$c['name']}» створено.");
        }
        $map[$c['idnumber']] = $id;
    }
    return $map;
}

/** JSON умови доступу: усі вказані елементи мають бути виконані. */
function utga_availability_completed(array $cmids): string {
    $conds = array_map(fn($id) => ['type' => 'completion', 'cm' => (int)$id, 'e' => COMPLETION_COMPLETE], $cmids);
    return json_encode(['op' => '&', 'c' => $conds, 'showc' => array_fill(0, count($conds), true)]);
}

/** HTML сторінки відеолекції: відео з субтитрами (якщо вже є) + текстова версія (WCAG 1.2.1–1.2.3). */
function utga_video_html(array $a): string {
    $html = $a['description_html'] ?? '';
    if (!empty($a['video_url'])) {
        $track = '';
        if (!empty($a['captions_url'])) {
            $track = '<track kind="captions" srclang="uk" label="Українська" src="' . s($a['captions_url']) . '" default>';
        }
        $html .= '<video controls preload="metadata" style="max-width:100%" aria-label="' . s($a['name']) . '">'
            . '<source src="' . s($a['video_url']) . '">' . $track . '</video>';
    } else {
        $html .= '<div class="alert alert-info" role="note"><p><strong>Відео готується.</strong> '
            . 'Воно буде опубліковане разом із субтитрами українською мовою.</p></div>';
    }
    $html .= '<h3>Текстова версія відеолекції</h3>' . ($a['transcript_html'] ?? '');
    return $html;
}

/** Сторінка «Про курс» у вступному розділі. */
function utga_about_html(array $spec): string {
    $html = $spec['summary_html'];
    $html .= '<h3>Для кого</h3><ul>' . implode('', array_map(fn($x) => '<li>' . s($x) . '</li>', $spec['audience'])) . '</ul>';
    $html .= '<h3>Обсяг</h3><p>Орієнтовно ' . (int)$spec['hours'] . ' академічних годин.</p>';
    $html .= '<h3>Як проходити курс</h3><ol>'
        . '<li>Модулі відкриваються послідовно: наступний стає доступним після опрацювання попереднього.</li>'
        . '<li>У кожному модулі перегляньте відеолекцію (або прочитайте її текстову версію) та посібник.</li>'
        . '<li>Пройдіть підсумковий тест (≥ ' . (int)$spec['final']['quiz']['pass_percent'] . '%)'
        . (empty($spec['final']['assignment']) ? '' : ', виконайте практичне завдання (оцінює експерт, ≥ '
            . (int)$spec['final']['assignment']['pass_grade'] . ' зі 100)')
        . ' і заповніть анкету.</li>'
        . '<li>Отримайте PDF-сертифікат і цифровий бейдж. Обидва можна перевірити онлайн.</li></ol>';
    if (!empty($spec['references'])) {
        $html .= '<h3>Стандарти та джерела</h3><ul>'
            . implode('', array_map(fn($x) => '<li>' . s($x) . '</li>', $spec['references'])) . '</ul>';
    }
    return $html;
}

function utga_build_course(testing_data_generator $gen, array $spec, string $dir, array $site, array $categories,
        bool $rebuild): void {
    global $DB, $CFG;

    $short = $spec['shortname'];
    $staff = [];
    if ($existing = $DB->get_record('course', ['shortname' => $short])) {
        if (!$rebuild) {
            mtrace("Курс {$short} вже існує — пропускаю (використайте --rebuild для перезбирання).");
            return;
        }
        foreach ($DB->get_records('badge', ['courseid' => $existing->id]) as $b) {
            (new badge($b->id))->delete(false);
        }
        $staff = utga_course_staff($existing->id);
        delete_course($existing, false);
        mtrace("Курс {$short} видалено для перезбирання.");
    }

    $nummodules = count($spec['modules']);
    $course = $gen->create_course([
        'fullname' => $spec['fullname'],
        'shortname' => $short,
        'idnumber' => $short,
        'category' => $categories[$spec['category']],
        'summary' => $spec['summary_html'],
        'summaryformat' => FORMAT_HTML,
        'format' => 'topics',
        'numsections' => $nummodules + 1,
        'enablecompletion' => 1,
        'showcompletionconditions' => 1,
        // "visible": false — курс-оболонка, прихований від слухачів, доки зміст не затверджено.
        'visible' => (int)($spec['visible'] ?? 1),
        // Примусова мова курсу лише якщо мовний пакет встановлено (інакше JS-компоненти Moodle видають помилки).
        'lang' => get_string_manager()->translation_exists($site['site']['lang'], false) ? $site['site']['lang'] : '',
    ], ['createsections' => true]);
    mtrace("Курс {$short}: створено (id {$course->id}).");

    $completioncms = [];
    $pageopts = ['completion' => COMPLETION_TRACKING_AUTOMATIC, 'completionview' => 1];
    $pagebase = ['course' => $course->id, 'contentformat' => FORMAT_HTML, 'printintro' => 0, 'printlastmodified' => 0,
        'printheading' => 1, 'intro' => '', 'introformat' => FORMAT_HTML];

    // Розділ 0 — вступ.
    $about = $gen->create_module('page', $pagebase + ['section' => 0, 'name' => 'Про курс',
        'content' => utga_about_html($spec)], $pageopts);
    $completioncms[] = $about->cmid;
    $previouslast = $about->cmid;

    // Модулі — кожен відкривається після завершення останньої активності попереднього.
    foreach ($spec['modules'] as $i => $m) {
        $sectionnum = $i + 1;
        $section = $DB->get_record('course_sections', ['course' => $course->id, 'section' => $sectionnum], '*', MUST_EXIST);
        course_update_section($course, $section, [
            'name' => $m['title'],
            'summary' => $m['summary_html'],
            'summaryformat' => FORMAT_HTML,
            'availability' => utga_availability_completed([$previouslast]),
        ]);
        foreach ($m['activities'] as $a) {
            $content = $a['type'] === 'video' ? utga_video_html($a) : $a['content_html'];
            $cm = $gen->create_module('page', $pagebase + ['section' => $sectionnum, 'name' => $a['name'],
                'content' => $content], $pageopts);
            $completioncms[] = $cm->cmid;
            $previouslast = $cm->cmid;
        }
    }

    // Фінальний розділ.
    $finalnum = $nummodules + 1;
    $section = $DB->get_record('course_sections', ['course' => $course->id, 'section' => $finalnum], '*', MUST_EXIST);
    course_update_section($course, $section, [
        'name' => 'Фінальний етап курсу',
        'summary' => empty($spec['final']['assignment'])
            ? '<p>Пройдіть підсумковий тест і заповніть анкету — після цього стане доступним сертифікат.</p>'
            : '<p>Пройдіть підсумковий тест, виконайте практичне завдання (його оцінює експерт) і заповніть анкету — '
                . 'після цього стане доступним сертифікат.</p>',
        'summaryformat' => FORMAT_HTML,
        'availability' => utga_availability_completed([$previouslast]),
    ]);

    $f = $spec['final'];
    $grade = 10.0;
    $quiz = $gen->create_module('quiz', [
        'course' => $course->id, 'section' => $finalnum,
        'name' => $f['quiz']['name'], 'intro' => $f['quiz']['intro_html'], 'introformat' => FORMAT_HTML,
        'grade' => $grade, 'gradepass' => $grade * $f['quiz']['pass_percent'] / 100,
        'attempts' => 0, 'grademethod' => QUIZ_GRADEHIGHEST, 'questionsperpage' => 0,
        // Правильні відповіді не показуємо, щоб тест залишався валідним при необмежених спробах.
        'rightanswerimmediately' => 0, 'rightansweropen' => 0, 'rightanswerclosed' => 0,
        'specificfeedbackimmediately' => 0, 'specificfeedbackopen' => 0, 'specificfeedbackclosed' => 0,
    ], ['completion' => COMPLETION_TRACKING_AUTOMATIC, 'completiongradeitemnumber' => 0, 'completionpassgrade' => 1]);
    $n = utga_import_gift($course, $quiz, $dir . '/' . $f['quiz']['gift_file']);
    mtrace("  тест: {$n} запитань, прохідний бал {$f['quiz']['pass_percent']}%.");
    $completioncms[] = $quiz->cmid;

    // Необов'язкове практичне завдання, яке оцінює експерт (для програм, що підтверджують кваліфікацію).
    $gate = [$quiz->cmid];
    if (!empty($f['assignment'])) {
        $a = $f['assignment'];
        $assign = $gen->create_module('assign', [
            'course' => $course->id, 'section' => $finalnum,
            'name' => $a['name'], 'intro' => $a['intro_html'], 'introformat' => FORMAT_HTML,
            'grade' => 100, 'gradepass' => $a['pass_grade'],
            'assignsubmission_onlinetext_enabled' => 1,
            'assignsubmission_file_enabled' => 1, 'assignsubmission_file_maxfiles' => 5,
            'assignsubmission_file_maxsizebytes' => 20 * 1024 * 1024,
            'assignfeedback_comments_enabled' => 1,
            'submissiondrafts' => 1, 'sendnotifications' => 1,
            // Якщо експерт не зарахував — слухач може доопрацювати й подати знову.
            'attemptreopenmethod' => 'untilpass', 'maxattempts' => -1,
            'availability' => utga_availability_completed([$quiz->cmid]),
        ], ['completion' => COMPLETION_TRACKING_AUTOMATIC, 'completiongradeitemnumber' => 0, 'completionpassgrade' => 1]);
        $completioncms[] = $assign->cmid;
        $gate[] = $assign->cmid;
        mtrace("  практичне завдання: оцінює експерт, прохідний бал {$a['pass_grade']}/100.");
    }

    $feedback = $gen->create_module('feedback', [
        'course' => $course->id, 'section' => $finalnum,
        'name' => $f['feedback']['name'], 'intro' => $f['feedback']['intro_html'], 'introformat' => FORMAT_HTML,
        'anonymous' => 1, 'multiple_submit' => 0, 'completionsubmit' => 1,
        'availability' => utga_availability_completed($gate),
    ], ['completion' => COMPLETION_TRACKING_AUTOMATIC]);
    utga_feedback_items($gen, $feedback);
    $completioncms[] = $feedback->cmid;

    $cert = $gen->create_module('customcert', [
        'course' => $course->id, 'section' => $finalnum,
        'name' => $f['certificate']['name'],
        'intro' => '<p>Сертифікат можна перевірити онлайн за унікальним кодом або QR-кодом.</p>', 'introformat' => FORMAT_HTML,
        'verifyany' => 1, 'deliveryoption' => 'D',
        'availability' => utga_availability_completed(array_merge($gate, [$feedback->cmid])),
    ], ['completion' => COMPLETION_TRACKING_AUTOMATIC, 'completionview' => 1]);
    utga_certificate_template($cert, $spec, $site);

    // Завершення курсу: усі навчальні елементи + тест (з прохідним балом) + анкета.
    $criterion = new completion_criteria_activity();
    $criteriadata = (object)['id' => $course->id, 'criteria_activity' => array_fill_keys($completioncms, 1)];
    $criterion->update_config($criteriadata);
    $DB->insert_record('course_completion_aggr_methd', (object)['course' => $course->id,
        'criteriatype' => null, 'method' => COMPLETION_AGGREGATION_ALL]);

    // Самостійний запис.
    $self = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'self']);
    if ($self) {
        $plugin = enrol_get_plugin('self');
        $plugin->update_status($self, ENROL_INSTANCE_ENABLED);
    } else {
        enrol_get_plugin('self')->add_default_instance($course);
    }

    utga_restore_staff($course, $staff);
    utga_badge($course, $spec, $site, $dir);
    rebuild_course_cache($course->id, true);
    mtrace("Курс {$short}: зібрано ({$nummodules} модулів, сертифікат, бейдж).");
}

/** Викладачі, асистенти й менеджери курсу — щоб --rebuild їх не загубив. Повертає [[userid, roleid], …]. */
function utga_course_staff(int $courseid): array {
    global $DB;
    $sql = "SELECT ra.id, ra.userid, ra.roleid
              FROM {role_assignments} ra
              JOIN {role} r ON r.id = ra.roleid
             WHERE ra.contextid = :ctx AND r.archetype IN ('editingteacher', 'teacher', 'manager')";
    $rows = $DB->get_records_sql($sql, ['ctx' => context_course::instance($courseid)->id]);
    return array_values(array_map(fn($r) => [(int)$r->userid, (int)$r->roleid], $rows));
}

/** Повертає збережених викладачів у перезібраний курс (ручний запис, ті самі ролі). */
function utga_restore_staff(stdClass $course, array $staff): void {
    global $DB;
    if (!$staff) {
        return;
    }
    $manual = enrol_get_plugin('manual');
    $instance = $DB->get_record('enrol', ['courseid' => $course->id, 'enrol' => 'manual']);
    if (!$instance) {
        $instance = $DB->get_record('enrol', ['id' => $manual->add_default_instance($course)], '*', MUST_EXIST);
    }
    foreach ($staff as [$userid, $roleid]) {
        if (!$DB->record_exists('user', ['id' => $userid, 'deleted' => 0])) {
            continue;
        }
        $manual->enrol_user($instance, $userid, $roleid);
    }
    mtrace('  відновлено викладачів: ' . count(array_unique(array_column($staff, 0))) . '.');
}

/** Імпорт запитань GIFT у банк запитань курсу та додавання їх у тест. */
function utga_import_gift(stdClass $course, stdClass $quiz, string $path): int {
    global $DB;
    $context = context_course::instance($course->id);
    $category = question_get_default_category($context->id) ?: question_make_default_categories([$context]);

    $qformat = new qformat_gift();
    $qformat->setCategory($category);
    $qformat->setContexts([$context]);
    $qformat->setCourse($course);
    $qformat->setFilename($path);
    $qformat->setRealfilename(basename($path));
    $qformat->setMatchgrades('error');
    $qformat->setCatfromfile(false);
    $qformat->setContextfromfile(false);
    $qformat->setStoponerror(true);
    $qformat->set_display_progress(false);

    ob_start();
    $ok = $qformat->importpreprocess() && $qformat->importprocess() && $qformat->importpostprocess();
    $out = ob_get_clean();
    if (!$ok) {
        throw new moodle_exception('error', 'error', '', null, "Імпорт GIFT не вдався ({$path}): " . strip_tags($out));
    }

    $quizrecord = $DB->get_record('quiz', ['id' => $quiz->id], '*', MUST_EXIST);
    foreach ($qformat->questionids as $qid) {
        quiz_add_quiz_question($qid, $quizrecord, 0);
    }
    \mod_quiz\quiz_settings::create($quiz->id)->get_grade_calculator()->recompute_quiz_sumgrades();
    return count($qformat->questionids);
}

/** Анкета зворотного зв'язку: оцінка корисності, зрозумілості, доступності + відкрите запитання. */
function utga_feedback_items(testing_data_generator $gen, stdClass $feedback): void {
    $fg = $gen->get_plugin_generator('mod_feedback');
    $scale = "1 — зовсім ні\n2\n3\n4\n5 — повною мірою";
    $fg->create_item_multichoice($feedback, ['name' => 'Наскільки корисним був курс для вашої роботи?',
        'label' => 'useful', 'values' => $scale, 'required' => 1]);
    $fg->create_item_multichoice($feedback, ['name' => 'Наскільки зрозумілими були матеріали?',
        'label' => 'clear', 'values' => $scale, 'required' => 1]);
    $fg->create_item_multichoice($feedback, [
        'name' => 'Чи були матеріали доступними для вас (субтитри, текстові версії, читабельність, навігація з клавіатури)?',
        'label' => 'accessible', 'values' => "Так\nЧастково\nНі", 'required' => 1]);
    $fg->create_item_textarea($feedback, ['name' => 'Що варто покращити або додати до курсу?', 'label' => 'improve']);
}

/** Шаблон PDF-сертифіката (A4 альбомна): ПІБ, курс, години, дата, унікальний код і QR-код для перевірки. */
function utga_certificate_template(stdClass $cert, array $spec, array $site): void {
    global $DB;
    $record = $DB->get_record('customcert', ['id' => $cert->id], '*', MUST_EXIST);
    $template = new \mod_customcert\template($DB->get_record('customcert_templates', ['id' => $record->templateid]));
    // customcert створює першу сторінку сам; додаємо нову лише якщо її немає.
    $pageid = $DB->get_field('customcert_pages', 'id', ['templateid' => $record->templateid, 'sequence' => 1])
        ?: $template->add_page(false);
    $DB->update_record('customcert_pages', (object)['id' => $pageid, 'width' => 297, 'height' => 210,
        'leftmargin' => 0, 'rightmargin' => 0]);

    $font = $site['certificates']['font'];
    $c = $spec['final']['certificate'];
    $seq = 0;
    $add = function(string $element, string $name, $data, int $posy, int $size = 14, int $posx = 148, int $width = 0,
            int $refpoint = 1, string $colour = '#1F2937') use ($DB, $pageid, $font, &$seq) {
        $DB->insert_record('customcert_elements', (object)[
            'pageid' => $pageid, 'element' => $element, 'name' => $name, 'data' => $data,
            'font' => $font, 'fontsize' => $size, 'colour' => $colour,
            'posx' => $posx, 'posy' => $posy, 'width' => $width, 'refpoint' => $refpoint, 'alignment' => 'C',
            'sequence' => ++$seq, 'timecreated' => time(), 'timemodified' => time(),
        ]);
    };

    $add('border', 'Рамка', '2', 0, 12, 0, 0, 0, '#1E3A8A');
    $org = $site['organisation'];
    $add('text', 'Організація', $org['name_full'] . ' (' . $org['name_short'] . ')', 16, 12, 148, 250);
    $add('text', 'ЄДРПОУ', 'ЄДРПОУ ' . $org['edrpou'] . ' · ' . preg_replace('#^https?://#', '', $org['url']), 23, 9, 148, 250,
        1, '#4B5563');
    $add('text', 'Заголовок', $c['title'], 40, 34, 148, 250, 1, '#1E3A8A');
    $add('text', 'Підзаголовок', $c['subtitle'], 58, 14, 148, 250);
    $add('text', 'Підтверджує', 'Цим підтверджується, що', 76, 12, 148, 250);
    $add('studentname', "Ім'я слухача", '', 88, 26, 148, 250, 1, '#111827');
    $add('text', 'Завершив', 'успішно завершив(-ла) навчальний курс', 106, 12, 148, 250);
    $add('coursename', 'Назва курсу', json_encode(['coursenamedisplay' => 'fullname']), 116, 18, 148, 250, 1, '#1E3A8A');
    $ects = empty($spec['ects']) ? '' : ' (' . $spec['ects'] . ' кредити ЄКТС)';
    $add('text', 'Обсяг', 'Обсяг: ' . (int)$spec['hours'] . ' академічних годин' . $ects, 138, 12, 148, 250);
    $add('text', 'Підпис дати', 'Дата видачі', 166, 8, 60, 80, 1, '#4B5563');
    $add('date', 'Дата', json_encode(['dateitem' => '-1', 'dateformat' => 'strftimedate']), 172, 11, 60, 80);
    $add('text', 'Підпис коду', 'Код перевірки', 166, 8, 237, 80, 1, '#4B5563');
    $add('code', 'Код перевірки', '', 172, 11, 237, 80);
    $add('qrcode', 'QR-код перевірки', json_encode(['width' => 28, 'height' => 28]), 160, 10, 133, 0, 0);
    $add('text', 'Як перевірити', 'Перевірити сертифікат: QR-код або код на сторінці перевірки сертифікатів Академії',
        192, 8, 148, 250, 1, '#4B5563');
}

/** Курсовий бейдж Open Badges 2.0, що видається автоматично після завершення курсу; ESCO — як alignment. */
function utga_badge(stdClass $course, array $spec, array $site, string $dir): void {
    global $DB, $USER, $CFG;
    $b = $spec['final']['badge'];
    $now = time();
    $id = $DB->insert_record('badge', (object)[
        'name' => $b['name'], 'description' => $b['description'],
        'timecreated' => $now, 'timemodified' => $now, 'usercreated' => $USER->id, 'usermodified' => $USER->id,
        'issuername' => $site['badges']['issuer_name'], 'issuerurl' => $site['badges']['issuer_url'],
        'issuercontact' => $site['badges']['issuer_contact'],
        'type' => BADGE_TYPE_COURSE, 'courseid' => $course->id,
        'messagesubject' => 'Вітаємо! Ви отримали бейдж «' . $b['name'] . '»',
        'message' => '<p>Вітаємо! Ви отримали цифровий бейдж «%badgename%». Його можна перевірити онлайн та додати до свого профілю.</p>',
        'attachment' => 1, 'notification' => 0, 'status' => BADGE_STATUS_INACTIVE,
        'version' => '1.0', 'language' => $site['site']['lang'],
        'imageauthorname' => $site['badges']['issuer_name'], 'imagecaption' => $b['name'],
    ]);
    $badge = new badge($id);

    award_criteria::build(['badgeid' => $id, 'criteriatype' => BADGE_CRITERIA_TYPE_OVERALL])
        ->save(['agg' => BADGE_CRITERIA_AGGREGATION_ALL]);
    award_criteria::build(['badgeid' => $id, 'criteriatype' => BADGE_CRITERIA_TYPE_COURSE])
        ->save(['course_' . $course->id => $course->id, 'agg' => BADGE_CRITERIA_AGGREGATION_ALL]);

    // Прив'язка до ESCO додається лише для верифікованих URI — без вигаданих кодів.
    foreach ($spec['competences'] as $comp) {
        if (!empty($comp['uri'])) {
            $badge->save_alignment((object)['targetname' => $comp['label'], 'targeturl' => $comp['uri'],
                'targetdescription' => '', 'targetframework' => $comp['framework'], 'targetcode' => '']);
        }
    }

    // Власне зображення (final.badge.image, PNG від 300×300) або тимчасове згенероване.
    if (!empty($b['image'])) {
        $png = make_request_directory() . '/badge.png';
        copy($dir . '/' . $b['image'], $png);
    } else {
        $png = utga_badge_png($spec['shortname']);
    }
    badges_process_badge_image($badge, $png);
    $badge->set_status(BADGE_STATUS_ACTIVE);
}

/** Тимчасове зображення бейджа (до появи дизайну від Асоціації): коло з шифром курсу. */
function utga_badge_png(string $label): string {
    $size = 300;
    $img = imagecreatetruecolor($size, $size);
    imagesavealpha($img, true);
    imagefill($img, 0, 0, imagecolorallocatealpha($img, 0, 0, 0, 127));
    imagefilledellipse($img, 150, 150, 290, 290, imagecolorallocate($img, 30, 58, 138));
    imagefilledellipse($img, 150, 150, 250, 250, imagecolorallocate($img, 250, 204, 21));
    imagefilledellipse($img, 150, 150, 230, 230, imagecolorallocate($img, 30, 58, 138));
    $white = imagecolorallocate($img, 255, 255, 255);
    $text = 'UTGA';
    imagestring($img, 5, (int)(150 - strlen($text) * 4.5), 120, $text, $white);
    imagestring($img, 5, (int)(150 - strlen($label) * 4.5), 160, $label, $white);
    $path = make_request_directory() . '/badge.png';
    imagepng($img, $path);
    imagedestroy($img);
    return $path;
}
