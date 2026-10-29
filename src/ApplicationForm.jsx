import React, { useRef, useState } from 'react';
import { sections } from './conference.js';
import { applicationConfig as config, supervisors } from './application-config.js';
import { validateApplication, submitApplication } from './application.js';
export default function ApplicationForm(){
  const [errors,setErrors]=useState({}), [status,setStatus]=useState(''), [busy,setBusy]=useState(false);
  const form=useRef(null), dialog=useRef(null), submit=useRef(null), request=useRef(null);
  const demo=config.demo || !config.approved || !config.endpoint || !config.consentVersion;
  async function handleSubmit(event){
    event.preventDefault(); if(busy)return;
    const values=Object.fromEntries(new FormData(form.current));
    const data={...values,consent:values.consent==='on'};
    const next=validateApplication(data);setErrors(next);setStatus('');
    if(Object.keys(next).length){form.current.elements[Object.keys(next)[0]].focus();return;}
    if(demo){setStatus('Поля заполнены корректно. Это демонстрация: данные никуда не отправлены и заявка не создана.');return;}
    setBusy(true);
    try{
      request.current ??= crypto.randomUUID();
      await submitApplication(data,config,request.current);
      dialog.current.showModal();form.current.reset();request.current=null;
    }catch(error){setStatus(error.message || 'Ошибка связи. Сохранение не подтверждено.');}
    finally{setBusy(false);}
  }
  const field=(key,label,extra={})=><label className="application-field">{label}<input name={key} aria-label={label} required aria-invalid={!!errors[key]} aria-describedby={errors[key]?`error-${key}`:undefined} {...extra}/>{errors[key]&&<span className="field-error" id={`error-${key}`}>{errors[key]}</span>}</label>;
  return <div className="application-card"><div className="eyebrow">ПРЕДВАРИТЕЛЬНАЯ ЗАЯВКА</div><h3>Начните с вашей идеи</h3><p id="demo-notice" className="demo-notice">Демонстрационный режим. Используйте вымышленные данные. Реальные заявки не принимаются; преподаватели в списке — демонстрационные записи. Регистрация по-прежнему проходит через преподавателей.</p>
  <form ref={form} noValidate onSubmit={handleSubmit} aria-describedby="demo-notice" className="application-form">
    {field('name','ФИО студента',{maxLength:150,autoComplete:'off'})}{field('email','Email',{type:'email',maxLength:254,autoComplete:'off'})}
    <label className="application-field">Научный руководитель<select aria-label="Научный руководитель" name="supervisorId" required aria-invalid={!!errors.supervisorId} aria-describedby="error-supervisorId"><option value="">Выберите руководителя</option>{supervisors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><span id="error-supervisorId" className="field-error">{errors.supervisorId}</span></label>
    <label className="application-field">Секция конференции<select aria-label="Секция конференции" name="sectionId" required aria-invalid={!!errors.sectionId} aria-describedby="error-sectionId"><option value="">Выберите секцию</option>{sections.map((s,i)=><option key={s.day} value={`section-${i+1}`}>{s.title}</option>)}</select><span id="error-sectionId" className="field-error">{errors.sectionId}</span></label>
    <label className="application-field full-width">Предполагаемая тема исследования<textarea aria-label="Предполагаемая тема исследования" name="topic" required minLength={10} maxLength={1000} rows={3} aria-invalid={!!errors.topic} aria-describedby="error-topic"/><span id="error-topic" className="field-error">{errors.topic}</span></label>
    <label className="consent full-width"><input name="consent" type="checkbox" required aria-describedby="consent-help error-consent" aria-invalid={!!errors.consent}/><span>Согласие на обработку персональных данных — демонстрационный элемент формы.</span></label>
    <p id="consent-help" className="full-width form-help">В деморежиме согласие юридически не собирается. Условия обработки, оператор и сроки хранения ещё не согласованы. Не вводите реальные персональные данные.</p><span id="error-consent" className="field-error full-width">{errors.consent}</span>
    <button ref={submit} className="button" disabled={busy} type="submit">{busy?'Отправка…':demo?'Проверить форму без отправки':'Отправить заявку'} <span aria-hidden="true">→</span></button><p className="form-status full-width" role="status">{status}</p>
  </form><dialog ref={dialog} className="application-dialog" aria-labelledby="receipt-title" onClose={()=>submit.current?.focus()}><h3 id="receipt-title">Заявка получена</h3><p>Она направлена выбранному научному руководителю для рассмотрения.</p><form method="dialog"><button className="button" autoFocus>Закрыть</button></form></dialog></div>;
}
