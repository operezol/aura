import { createComponent, createSignal, createComputed, createEffect, createElement, mount } from '@aura/runtime';
import { createSpace } from '@aura/runtime/store.js';
import { createAnimationController } from '@aura/animation';

export const MyApp = createComponent({
  name: 'MyApp',
  setup(props) {
    const [active, setActive] = createSignal(true);
    const handleToggle = () => {
      Theme.dark;
    };
    
    return {
      active,
      handleToggle,
    };
  },
  render(ctx) {
    return [
      createElement('Theme', null, [
      ]),
      createElement('dark', null, [
      ]),
      createElement('local', null, [
      ]),
      createElement('card', null, [
        createElement('box', null, [
        ]),
      ]),
      createElement('shadow', null, [
        '0 2px 5px rgba(0,0,0,0.1)',
      ]),
      createElement('div', { class: 'container', style: 'background: ${Theme.bg}; color: ${Theme.color}' }, [
        createElement('h1', null, [
          'Aura Features Demo',
        ]),
        createElement('div', { class: 'local-card' }, [
          createElement('p', null, [
            'Current Theme: {Theme.dark ? \'Dark\' : \'Light\'}',
          ]),
          createElement('button', { class: 'btn', onclick: toggle, role: 'switch', aria-label: 'Toggle Theme' }, [
            'Toggle Mode',
          ]),
          createElement('img', { src: 'logo.png', alt: 'Aura Logo' }, [
          ]),
        ]),
      ]),
    ];
  }
});

export const Theme = createSpace(
  'Theme',
  {
    dark: false,
    accent: '#3498db',
  },
  {
    bg: function() { return (dark ? '#111' : '#fff'); },
    color: function() { return (dark ? '#eee' : '#222'); },
  },
  [
  ]
);
