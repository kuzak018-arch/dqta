# Dota 2 — песочница сборок

Статичный сайт для сборок предметов Dota 2: выбор героя, слоты инвентаря,
каталог предметов и этапы сборки. Только HTML, CSS и JavaScript: без
фреймворков, без сборки и без зависимостей.

## Запуск локально

Сайт загружает `data/*.json` через `fetch` и использует ES-модули, поэтому
открыть `index.html` двойным кликом (`file://`) не получится. Нужен любой
статический HTTP-сервер, запущенный из корня репозитория:

```sh
python3 -m http.server 8000
# или
npx serve .
```

Затем откройте http://localhost:8000.

## Публикация на GitHub Pages

1. Settings → Pages → Build and deployment → Source: **Deploy from a branch**.
2. Branch: нужная ветка, папка **/ (root)** → Save.

Все пути относительные, поэтому сайт работает и по адресу вида
`https://<user>.github.io/<repo>/`. Файл `.nojekyll` отключает обработку Jekyll,
и GitHub Pages отдаёт файлы как есть.

## Данные

- `data/items.json`, `data/heroes.json` скачаны из
  [odota/dotaconstants](https://github.com/odota/dotaconstants/tree/master/build)
  (ветка `master`, папка `build`).
- Иконки: `https://cdn.cloudflare.steamstatic.com` + поле `img` из этих файлов.
  Если CDN недоступен, на плитках показываются названия, а в шапке — сколько
  иконок не загрузилось.
- В `items.json` нет раздела магазина, поэтому раскладка по категориям
  (Расходуемые, Атрибуты, … Артефакты) задана вручную в `js/shop.js` по патчу
  7.41. Там же список скрытых предметов: удалённых из игры, дропов с Рошана и
  прочих служебных. Нейтральные предметы определяются по полю `tier`.

Обновить данные:

```sh
curl -fsSo data/items.json  https://raw.githubusercontent.com/odota/dotaconstants/master/build/items.json
curl -fsSo data/heroes.json https://raw.githubusercontent.com/odota/dotaconstants/master/build/heroes.json
```

Новый предмет, которого нет в `js/shop.js`, попадёт в категорию «Прочее».

Проверить, что все ссылки на иконки отдают картинки (Node.js 18+):

```sh
node tools/check-icons.mjs
```

## Структура

```
index.html          разметка
css/style.css       тёмная тема и адаптивная вёрстка
js/main.js          точка входа, обработчики
js/data.js          загрузка и нормализация data/*.json
js/shop.js          категории магазина и скрытые предметы
js/state.js         состояние сборки и операции над ним
js/render.js        отрисовка панелей
tools/check-icons.mjs  проверка ссылок на иконки
```
