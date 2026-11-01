const ROOT='./assets/films/gold-under-glass';

// These clips are contemporary motion compositions, not archival footage.
// Watching or replaying a film never changes a visit or puzzle state.
export const SHORT_FILMS={
 opening:{
  id:'opening',label:'01 / Opening',title:'A line left unfinished',
  description:'The paper edges part, and the commission lands at the window of the old press.',duration:8,
  src:`${ROOT}/opening.mp4`,poster:`${ROOT}/opening.jpg`,track:`${ROOT}/opening.en.vtt`,
  continueLabel:'Start observing the first stop',
  captions:[{start:.6,end:3.7,text:'Some names survive only in very small places.'},{start:4,end:7.7,text:'Start at 101 Jalan Sultan.'}],
 },
 passage:{
  id:'passage',label:'02 / Between stops',title:'Following the address on paper',
  description:'Put the proof book away and carry the parcel to the next building.',duration:8,
  src:`${ROOT}/passage.mp4`,poster:`${ROOT}/passage.jpg`,track:`${ROOT}/passage.en.vtt`,
  continueLabel:'See the second stop task',
  captions:[{start:.6,end:3.7,text:'The small print kept the printers.'},{start:4,end:7.7,text:'For the next line, look beneath the golden dome.'}],
 },
 reward:{
  id:'reward',label:'03 / Finale',title:'This line is for ordinary people',
  description:'The glass catches the light, and two observations finally make one complete street paper.',duration:8,
  src:`${ROOT}/reward.mp4`,poster:`${ROOT}/reward.jpg`,track:`${ROOT}/reward.en.vtt`,
  continueLabel:'Keep the find and go back',
  captions:[{start:.6,end:3.8,text:'Even ordinary glass can carry a gift.'},{start:4.2,end:7.7,text:'Your find is now part of the street paper.'}],
 },
};

export const SHORT_FILM_ORDER=['opening','passage','reward'];
