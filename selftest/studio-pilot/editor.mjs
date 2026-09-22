import { createStudioStore } from './core/store.mjs'
import { createApproval } from './core/snapshot.mjs'
import { defaults, parse, check, designTokens, project } from './profile.mjs'
import { renderPage, cssTokens } from './render.mjs'
const content = await fetch('/content.json' + location.search).then(response => response.json())
const store = createStudioStore({ key: 'north-studio-design', defaults, parse, check, projectId: project.id, resolveTokens: designTokens, storage: () => localStorage, events: () => window })
const panel = document.querySelector('#studio')
panel.innerHTML = '<button id="collapse" aria-expanded="true">Свернуть настройки</button><div id="controls"><h2>Дизайн мастерской</h2><label>Основной текст <output id="bodyValue"></output><input id="bodySize" type="range" min="16" max="22" step="1"></label><label>H1 <output id="titleValue"></output><input id="headingSize" type="range" min="40" max="80" step="2"></label><div role="group" aria-label="Ширина">' + [1040,1200,1360].map(width=>'<button data-key="width" data-value="'+width+'">'+width+'</button>').join('') + '</div><div role="group" aria-label="Палитра"><button data-key="palette" data-value="forest">Лес</button><button data-key="palette" data-value="brass">Латунь</button></div><div role="group" aria-label="Композиция"><button data-key="layout" data-value="split">Две части</button><button data-key="layout" data-value="stacked">Одна колонка</button></div><button id="apply">Применить</button><button id="cancel">Отменить черновик</button><button id="approve">Подтвердить и скачать</button><p id="status" role="status"></p></div>'
let exporting = false
function render() {
  const state = store.getSnapshot(), design = state.draft
  document.querySelector('#tokens').textContent = cssTokens(designTokens(design))
  document.querySelector('#site').innerHTML = renderPage(design, content)
  document.querySelector('#layout').href = '/variants/' + design.layout + '.css'
  for (const key of ['bodySize','headingSize']) document.getElementById(key).value = design[key]
  document.querySelector('#bodyValue').value = design.bodySize + ' px'
  document.querySelector('#titleValue').value = design.headingSize + ' px'
  for (const button of panel.querySelectorAll('[data-key]')) button.setAttribute('aria-pressed',String(String(design[button.dataset.key])===button.dataset.value))
  document.querySelector('#status').textContent = state.error || (state.approved ? 'Проверочно утверждено · ' + state.approved.id.slice(0,12) : state.lastApproval ? 'Изменено после утверждения' : 'Черновик')
}
store.subscribe(render); render()
for (const key of ['bodySize','headingSize']) document.getElementById(key).oninput = event => store.draft({...store.getSnapshot().draft,[key]:Number(event.target.value)})
for (const button of panel.querySelectorAll('[data-key]')) button.onclick = () => store.draft({...store.getSnapshot().draft,[button.dataset.key]:button.dataset.key==='width'?Number(button.dataset.value):button.dataset.value})
document.querySelector('#apply').onclick = () => store.apply()
document.querySelector('#cancel').onclick = () => store.draft(store.getSnapshot().applied)
document.querySelector('#collapse').onclick = event => { const controls=document.querySelector('#controls'); controls.hidden=!controls.hidden; event.target.setAttribute('aria-expanded',String(!controls.hidden)); event.target.textContent=controls.hidden?'Открыть настройки':'Свернуть настройки' }
document.querySelector('#approve').onclick = async () => {
  if(exporting)return
  exporting=true; document.querySelector('#approve').disabled=true
  try {
    const design=structuredClone(store.getSnapshot().draft), tokens=designTokens(design)
    const response=await fetch('/export',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({design})})
    if(!response.ok)throw new Error('Экспорт не прошёл проверку')
    const result=await response.json()
    const record=await createApproval({design,tokens,projectId:project.id,sourceRevision:project.sourceRevision,actor:'verification',now:result.approvedAt})
    if(record.id!==result.id)throw new Error('Снимки не совпадают')
    if(!await store.approve(record,tokens,project.id))throw new Error('Не удалось сохранить подтверждение')
    const link=document.createElement('a');link.href=result.url;link.download='north-design.tar';link.click()
  }catch(error){document.querySelector('#status').textContent=error.message}
  finally{exporting=false;document.querySelector('#approve').disabled=false}
}
