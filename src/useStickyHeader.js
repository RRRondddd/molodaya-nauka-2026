import { useEffect } from 'react';
// Keep native anchor navigation clear of the actual (including mobile) header.
export function useStickyHeader(){
 useEffect(()=>{
  const header=document.querySelector('header');
  const update=()=>document.documentElement.style.setProperty('--header-height',`${header.getBoundingClientRect().height}px`);
  update();const observer=new ResizeObserver(update);observer.observe(header);
  return()=>observer.disconnect();
 },[]);
}
