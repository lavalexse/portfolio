# Portfolio Studio — Alexander Lavrikov

Тёмное, лёгкое портфолио с четырьмя галереями и **локальной админкой без сервера**. Работает на GitHub Pages; сборка и npm не нужны.

## Быстрый старт

1. Распакуй `portfolio-studio-dark-final.zip` в отдельную папку.
2. Дважды кликни `index.html`, чтобы посмотреть сайт.
3. Дважды кликни **`admin.html`**, чтобы открыть панель управления.
4. Выбери раздел слева: **Баннеры**, **Видео-креативы**, **AI / Липсинк**, **Стикеры**.
5. Нажми **«Добавить работы»** или значок карандаша на карточке для редактирования. Можно менять файлы, обложки, названия RU/EN, галерею, тег, порядок карточек и контакты.
6. Нажми **«Экспорт ZIP»**. Распакуй полученный `portfolio-update-ГГГГ-ММ-ДД.zip` **поверх папки исходного сайта** с объединением `assets` и заменой `projects-data.js` и `projects.json`.
7. Проверь `index.html`. Отправь изменённые файлы в GitHub через GitHub Desktop (commit + push) — GitHub Pages обновит страницу.

**Важно:** нажать «Сохранить изменения» внутри карточки недостаточно для публикации. Нужно отдельно сделать **«Экспорт ZIP»** или **«Сохранить в папку»**, а затем загрузить обновления на GitHub.

## Можно сохранять без ZIP

В **Chrome/Edge** админка позволяет выбрать локальную папку сайта и записать изменения туда напрямую через кнопку **«Выбрать папку сайта»** → **«Сохранить в папку»**. Для этого функция выбора папки должна быть доступна в безопасном контексте (например, `http://localhost` или HTTPS). При простом запуске `admin.html` через `file://` доступность зависит от браузера — в этом случае всегда работает экспорт ZIP.

Быстрый локальный запуск с Python (в терминале из папки сайта):

```bash
python -m http.server 8000
```

Открой `http://localhost:8000/admin.html`. Если Python нет, просто пользуйся `admin.html` + **«Экспорт ZIP»**.

## Публикация на бесплатном GitHub Pages

1. Создай публичный GitHub-репозиторий `portfolio`.
2. Добавь **все файлы и папку `assets` из архива** в корень репозитория (не архив ZIP одним файлом). Проще всего через GitHub Desktop.
3. На GitHub зайди в **Settings → Pages → Build and deployment → Deploy from a branch**.
4. Выбери ветку `main` и `/ (root)`, сохрани.
5. Адрес будет вида `https://YOUR-USERNAME.github.io/portfolio/`.

Сайт статический, поэтому ни платный хостинг, ни база данных, ни аккаунт CMS не нужны. Сам файл `admin.html` при загрузке в публичный репозиторий также будет доступен по URL, **но он не может самовольно изменять GitHub-репозиторий или сайт**: для публикации нужен твой ручной commit/push.

## Что умеет админка

- Добавлять сразу несколько JPG, PNG, WebP, AVIF и MP4/WebM.
- Оптимизировать изображения до WebP (без увеличения маленьких картинок).
- Создавать обложки для видео из кадра, если браузер поддерживает декодирование.
- Менять фото/видео, добавлять отдельную обложку и короткое hover-preview.
- Редактировать двуязычные названия и перемещать работу в другую галерею.
- Менять порядок мышкой или кнопками ↑ ↓.
- Удалять проекты из галереи (физические старые файлы вручную можно позже очистить).
- Редактировать Email и Telegram для блока контактов.
- Экспортировать **только обновления**: `projects-data.js`, `projects.json` и новые файлы. Старые медиа повторно не копируются в ZIP.

Изменения до экспорта или сохранения существуют только в открытой вкладке редактора. Не закрывай её, пока не сохранил изменения.

## Структура проекта

```text
index.html            ← публичный сайт (RU/EN)
admin.html            ← редактор контента
admin.css / admin.js  ← интерфейс и логика редактора
zip-pack.js           ← экспорт обновлений без внешних библиотек
projects-data.js      ← данные, которые читает сайт
projects.json         ← копия данных для импорта в редактор
script.js / styles.css
assets/images/        ← баннеры
assets/video/         ← видео-креативы, аватары и стикеры
assets/posters/       ← обложки видео
assets/previews/      ← короткие hover-превью
```

## Совместимость и ограничения

- Нужен актуальный браузер; для прямой записи в папку лучше Chrome или Edge.
- Видео для публикации лучше готовить в **MP4 (H.264)**. MOV/ProRes перед загрузкой перекодируй.
- GitHub Pages не предназначен для хранения гигабайт видео. Здесь уже используются веб-версии. Для больших пополнений проверяй лимиты GitHub по размеру файлов и репозитория.
- Исходники ProRes/MOV и клиентские конфиденциальные работы храни вне публичного репозитория.
- Панель **не является защищённой серверной CMS** и не меняет GitHub в обход твоей авторизации.


## CV, contacts and favicon (V4 edition)

- The public portfolio links to `assets/cv/Lavrikov_CV.pdf` from the header, intro and footer. The intro/footer also show the email and Telegram stored in `projects.json` / `projects-data.js`.
- To replace the PDF, open `admin.html`, scroll to **Моё резюме**, click **Заменить CV**, select a PDF, then click **Сохранить в папку** or **Экспорт ZIP**. The exported update contains the new PDF and updated data.
- The website favicon is `favicon.png`. The header brand mark is still `logo.svg`.
- Primary highlight: `#9EDBF8` (light blue). All existing V4 galleries remain unchanged.
- GitHub Pages will publicly serve the PDF and the admin HTML if these files are uploaded. If you want the admin to remain local, exclude `admin.html`, `admin.js`, `admin.css`, and `zip-pack.js` from the public GitHub repository and keep a local complete copy.
