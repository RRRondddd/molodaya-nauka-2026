import React, { useRef, useState } from 'react';
import { sections } from './conference.js';
import { supervisors } from './application-config.js';
import { validateApplication, saveApplication, notifyApplicationsChanged } from './application.js';
export default function ApplicationForm(){
  const [errors,setErrors]=useState({}), [status,setStatus]=useState(''), [busy,setBusy]=useState(false);
  const form=useRef(null), dialog=useRef(null), submit=useRef(null), submitting=useRef(false);
  async function handleSubmit(event){
    event.preventDefault(); if(submitting.current)return;
    const values=Object.fromEntries(new FormData(form.current));
    const data=values;
    const next=validateApplication(data);setErrors(next);setStatus('');
    if(Object.keys(next).length){form.current.elements[Object.keys(next)[0]].focus();return;}
    submitting.current=true;setBusy(true);
    try{
      saveApplication(data);
      notifyApplicationsChanged();
      dialog.current.showModal();form.current.reset();
    }catch(error){setStatus(error.message || 'Не удалось сохранить заявку в браузере.');}
    finally{submitting.current=false;setBusy(false);}
  }
  const field=(key,label,extra={})=><label className="application-field">{label}<input name={key} aria-label={label} required aria-invalid={!!errors[key]} aria-describedby={errors[key]?`error-${key}`:undefined} {...extra}/>{errors[key]&&<span className="field-error" id={`error-${key}`}>{errors[key]}</span>}</label>;
  return <div className="application-card"><div className="eyebrow">ПРЕДВАРИТЕЛЬНАЯ ЗАЯВКА</div><h3>Начните с вашей идеи</h3><p id="registration-notice" className="demo-notice">Учебная система: используйте вымышленные данные. Заявки сохраняются только в этом браузере и не отправляются преподавателям.</p>
  <form ref={form} noValidate onSubmit={handleSubmit} aria-describedby="registration-notice" className="application-form"><fieldset disabled={busy} className="application-fields"><legend className="sr-only">Данные участника</legend>
    {field('name','ФИО студента',{maxLength:150,autoComplete:'off'})}{field('email','Email',{type:'email',maxLength:254,autoComplete:'off'})}
    <label className="application-field">Научный руководитель<select aria-label="Научный руководитель" name="supervisorId" required aria-invalid={!!errors.supervisorId} aria-describedby="error-supervisorId"><option value="">Выберите руководителя</option>{supervisors.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><span id="error-supervisorId" className="field-error">{errors.supervisorId}</span></label>
    <label className="application-field">Секция конференции<select aria-label="Секция конференции" name="sectionId" required aria-invalid={!!errors.sectionId} aria-describedby="error-sectionId"><option value="">Выберите секцию</option>{sections.map((s,i)=><option key={s.day} value={`section-${i+1}`}>{s.title}</option>)}</select><span id="error-sectionId" className="field-error">{errors.sectionId}</span></label>
    <label className="application-field full-width">Тема вашего исследования<textarea aria-label="Тема вашего исследования" name="topic" required minLength={10} maxLength={1000} rows={3} aria-invalid={!!errors.topic} aria-describedby="error-topic"/><span id="error-topic" className="field-error">{errors.topic}</span></label>
    <button ref={submit} className="button" disabled={busy} type="submit">{busy?'Отправка…':'Отправить заявку'} <span aria-hidden="true">→</span></button></fieldset><p className="form-status full-width" role="status">{status}</p>
  </form><dialog ref={dialog} className="application-dialog" aria-labelledby="receipt-title" onClose={()=>submit.current?.focus()}><h3 id="receipt-title">Заявка сохранена!</h3><p>Ваша тема исследования добавлена в систему заявок конференции</p><form method="dialog"><button className="button" autoFocus onClick={()=>{window.location.hash="home";}}>Вернуться на главную</button></form></dialog></div>;
}
