import { useEffect } from 'react';

// iOS keyboards resize the visual viewport without always resizing 100dvh.
export function useMobileChat(open, field, trigger) {
  useEffect(() => {
    if (!open) return;
    const panel = document.getElementById('chat-panel');
    const mobile = matchMedia('(max-width: 768px)');
    let restore;
    function configure() {
      restore?.();
      restore = undefined;
      if (!mobile.matches) {
        field.current?.focus({ preventScroll: true });
        return;
      }
      const x = scrollX, y = scrollY;
      const body = document.body;
      const previous = { position: body.style.position, top: body.style.top, left: body.style.left, width: body.style.width, overflow: body.style.overflow };
      Object.assign(body.style, { position: 'fixed', top: `${-y}px`, left: `${-x}px`, width: '100%', overflow: 'hidden' });
      const viewport = window.visualViewport;
      const update = () => {
        panel.style.setProperty('--chat-vh', `${viewport?.height ?? innerHeight}px`);
        panel.style.setProperty('--chat-top', `${viewport?.offsetTop ?? 0}px`);
      };
      update();
      viewport?.addEventListener('resize', update);
      viewport?.addEventListener('scroll', update);
      window.addEventListener('resize', update);
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      // Opening the sheet should not summon the keyboard until the user types.
      panel.querySelector('.chat-head button')?.focus({ preventScroll: true });
      const trap = event => {
        if (event.key !== 'Tab') return;
        const controls = [...panel.querySelectorAll('button:not(:disabled), input')];
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      };
      panel.addEventListener('keydown', trap);
      restore = () => {
        viewport?.removeEventListener('resize', update);
        viewport?.removeEventListener('scroll', update);
        window.removeEventListener('resize', update);
        panel.removeEventListener('keydown', trap);
        panel.removeAttribute('role');
        panel.removeAttribute('aria-modal');
        panel.style.removeProperty('--chat-vh');
        panel.style.removeProperty('--chat-top');
        Object.assign(body.style, previous);
        window.scrollTo(x, y);
      };
    }
    configure();
    mobile.addEventListener('change', configure);
    return () => {
      mobile.removeEventListener('change', configure);
      restore?.();
      trigger.current?.focus({ preventScroll: true });
    };
  }, [open, field, trigger]);
}
