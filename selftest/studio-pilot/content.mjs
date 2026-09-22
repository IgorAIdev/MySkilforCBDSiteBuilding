export async function contentProvider({ fail = false } = {}) {
  if (fail) return { state: 'unavailable', items: [] }
  return { state: 'ready', items: [
    { id: 'space', title: 'Пространство для жизни', text: 'От первого разговора до ясного плана: свет, материалы и удобство каждого дня.' },
    { id: 'detail', title: 'Внимание к деталям', text: 'Продумываем хранение, маршруты и небольшие привычки, из которых складывается дом.' },
  ] }
}
