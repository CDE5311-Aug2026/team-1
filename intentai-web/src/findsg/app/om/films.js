/* Hunt: a story asks its host to play films (the host owns the projector; see HuntPage's FilmHost). */
export const playFilm = (ids, title = '') => window.dispatchEvent(new CustomEvent('findsg:film', {detail: {ids, title}}));
