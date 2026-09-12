import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import '@fontsource/inter/700.css';
import './styles.css';
import { createGame } from './game/createGame';
import { mountUI } from './ui';
import { prepareIcons } from './prepareIcons';

const app = document.querySelector<HTMLElement>('#app');
if (!app) throw new Error('Missing app root.');

const ui = mountUI(app);
void prepareIcons().catch((error: unknown) => console.warn('Icon atlas preparation failed; using source atlas.', error));
const controller = createGame(ui.arena);
ui.connect(controller);

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    ui.destroy();
    controller.destroy();
  });
}
