# Нейтральные commerce-ресурсы

Копировать выбранные функции в общий слой сайта. ESM, без React/Next и SDK.
Сохранить три LICENSE-файла и реестр происхождения; при выборочном переносе
оставить лицензию именно используемого исходника. Это не готовый backend/cart SDK.

- `variant-selection.mjs`: options = `{id, values: string[]}[]`, variants =
  `{id, options: Record<string,string>, available: boolean}[]`. Provider проверяет
  схему входа. Display label отдельный. Цена/доступность покупки повторно проверяются сервером.
- `pagination.mjs`: принимает Request-like `{url}` и pageBy/namespace/maxPageSize.
  Значение maxPageSize=100 — ограничение по умолчанию ресурса, не лимит каждой CMS.
  Provider сопоставляет cursors со своим API. Изменение сортировки сбрасывает cursor.
- `cache-policy.mjs`: audience по умолчанию personal; public задаётся только для
  действительно общих данных. TTL выбирает владелец данных. Этот helper не
  конфигурирует framework-cache/CDN за вас и не даёт безопасность без проверки цепочки.
- `option-filters.mjs`: repeated и comma-separated option IDs; IDs с запятой
  не поддерживаются этим контрактом. Не использовать URL-фильтр как авторизацию.
- `mutation-lane.mjs`: один экземпляр на общий mutable ресурс; не создавать
  новый перед каждым кликом. UI показывает pending/error, не блокируя всю страницу.
  Никаких автоматических повторов; распределённые гонки решаются backend.

Не добавлять одновременно конкурирующий helper, если эквивалент уже есть в сайте.
Все эти функции можно использовать с нейтральными данными Payload/Vendure;
для native PHP/Twig переносится контракт и тестовые сценарии, а не требование Node.
