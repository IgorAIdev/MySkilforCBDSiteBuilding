import * as React from 'react'
import { createRoot } from 'react-dom/client'
import { Button } from '../../skills/site-building/assets/components/shadcn/button'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuCheckboxItem } from '../../skills/site-building/assets/components/shadcn/dropdown-menu'
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger,
  NavigationMenuContent, NavigationMenuLink } from '../../skills/site-building/assets/components/shadcn/navigation-menu'
import './style.css'

function App() {
  const [count, setCount] = React.useState(0)
  const [checked, setChecked] = React.useState(false)
  const [dark, setDark] = React.useState(false)
  return <main>
    <p className="eyebrow">SiteBuildingSkill · проверочный стенд</p>
    <h1>Готовые элементы.<br />Один согласованный вид.</h1>
    <p>Исходники shadcn/ui и SVG Lucide. Это изолированная проверка заготовок,
      а не выбранный дизайн магазина.</p>
    <section aria-labelledby="button-title">
      <h2 id="button-title">Кнопки и действие</h2>
      <div className="row">
        <Button onClick={() => setCount(count + 1)}>Добавить</Button>
        <Button variant="outline" asChild><a href="#details">Подробнее</a></Button>
        <Button disabled>Недоступно</Button>
        <Button variant="secondary" onClick={() => {
          setDark(!dark); document.documentElement.classList.toggle('dark', !dark)
        }}>Сменить тему</Button>
      </div>
      <p role="status">Добавлено: {count}</p>
    </section>
    <section aria-labelledby="menu-title">
      <h2 id="menu-title">Меню действий</h2>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild><Button variant="outline">Действия</Button></DropdownMenuTrigger>
        <DropdownMenuContent>
          <DropdownMenuItem onSelect={() => setCount(count + 1)}>Добавить ещё</DropdownMenuItem>
          <DropdownMenuCheckboxItem checked={checked} onCheckedChange={setChecked}>Выделить</DropdownMenuCheckboxItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled>Недоступное действие</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <p>Выделено: {checked ? 'да' : 'нет'}</p>
    </section>
    <section aria-labelledby="nav-title">
      <h2 id="nav-title">Навигация</h2>
      <NavigationMenu aria-label="Проверочная навигация" viewport={false}>
        <NavigationMenuList>
          <NavigationMenuItem>
            <NavigationMenuTrigger>Каталог</NavigationMenuTrigger>
            <NavigationMenuContent>
              <NavigationMenuLink asChild><a href="#details">Все элементы</a></NavigationMenuLink>
            </NavigationMenuContent>
          </NavigationMenuItem>
          <NavigationMenuItem><NavigationMenuLink asChild><a href="#details">О наборе</a></NavigationMenuLink></NavigationMenuItem>
        </NavigationMenuList>
      </NavigationMenu>
    </section>
    <section id="details" aria-labelledby="icons-title">
      <h2 id="icons-title">Один стиль иконок</h2>
      <div className="icons">{['menu', 'x', 'sun', 'moon', 'search', 'chevron-down', 'check', 'shopping-cart'].map(name =>
        <figure key={name}><img src={new URL(`../../skills/site-building/assets/icons/lucide/${name}.svg`, import.meta.url).href} alt="" width="24" height="24" /><figcaption>{name}</figcaption></figure>)}</div>
    </section>
  </main>
}

createRoot(document.getElementById('root')!).render(<App />)
