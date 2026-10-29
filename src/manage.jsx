import React from 'react';
import {createRoot} from 'react-dom/client';
import ApplicationsPanel from './ApplicationsPanel.jsx';
import {useStickyHeader} from './useStickyHeader.js';
import './styles.css';
function ManagementPage(){
 useStickyHeader();
 return <><header><div className="container header-inner"><a className="brand" href={import.meta.env.BASE_URL}>YOUNG SCIENCE 2026</a><a className="text-link" href={import.meta.env.BASE_URL}>На сайт конференции →</a></div></header><main><section className="manage-intro"><div className="container"><div className="eyebrow">УЧЕБНАЯ ДЕМОНСТРАЦИЯ</div><h1>Управление заявками</h1><p>Это открытая локальная модель, а не защищённый кабинет. Используйте только вымышленные записи. Данные остаются в этом браузере и доступны его пользователям.</p></div></section><ApplicationsPanel/></main><footer className="manage-footer"><div className="container footer-inner"><span>Young Science 2026</span><div className="footer-bottom">Учебный проект. Неофициальный сайт конференции</div></div></footer></>;
}
createRoot(document.getElementById('root')).render(<ManagementPage/>);
