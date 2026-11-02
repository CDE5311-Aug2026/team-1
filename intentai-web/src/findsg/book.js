// The FindSG pieces the Hunt story books are built from: paper objects, the tear ticket, the 3D building studies and
// the prototype's own progress rules. The book lays them out as pages; the pieces keep their own motion and materials.
import './app/styles.css';
export { default as TearTicket } from './app/game/TearTicket.jsx';
export { default as PaperObject, FieldBook } from './app/short/PaperObjects.jsx';
export { default as ShortScene } from './app/short/ShortScene.jsx';
import './app/short/ticket.css';
export { SHORT_EPISODE, shortMap, shortDirections } from './app/short/short-content.js';
export { readShort, saveShort, shortTransition, emptyShort, shortCount } from './app/short/short-state.js';
export { assetFor } from './app/data.js';
