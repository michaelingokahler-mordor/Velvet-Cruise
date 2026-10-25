/** One authored bend and one straight per stage; independent of difficulty. */
export interface StageExtension {
  curve: number;
  enter: number;
  hold: number;
  leave: number;
  straight: number;
  rise: number;
  description: string;
}

export const STAGE_EXTENSIONS: readonly StageExtension[] = [
  {curve: 2.1, enter:60, hold:140, leave:60, straight:260, rise:260, description:'Palm Cove: open coastal sweep and palm-lined straight'},
  {curve:-2.7, enter:60, hold:130, leave:60, straight:250, rise:600, description:'Coral Bluffs: rock-side bend and open settlement approach'},
  {curve: 2.0, enter:70, hold:150, leave:70, straight:230, rise:180, description:'Surfside: broad beach bend and sea-view straight'},
  {curve:-2.6, enter:70, hold:130, leave:70, straight:230, rise:450, description:'Cypress Point: wooded hillside bend and coastal outlook'},
  {curve: 2.2, enter:70, hold:130, leave:70, straight:250, rise:220, description:'Twilight Bay: lit hillside sweep and village approach'},
  {curve: 1.7, enter:80, hold:120, leave:80, straight:280, rise:0, description:'Thunder Highway: wide wet bend and long highway straight'},
  {curve:-2.5, enter:60, hold:130, leave:60, straight:250, rise:400, description:'Vineyard Valley: vineyard bend and estate-lined straight'},
  {curve:-3.3, enter:65, hold:120, leave:65, straight:230, rise:700, description:'Redwood Pass: climbing forest bend and open pass straight'},
  {curve: 2.0, enter:80, hold:120, leave:80, straight:260, rise:500, description:'Painted Desert: broad sandstone sweep and desert straight'},
  {curve:-1.5, enter:80, hold:120, leave:80, straight:280, rise:100, description:'Death Valley: fast open bend and salt-flat straight'},
  {curve: 2.6, enter:60, hold:120, leave:60, straight:260, rise:0, description:'Neon City: urban bend and illuminated avenue'},
  {curve:-3.1, enter:70, hold:110, leave:70, straight:230, rise:800, description:'Snowcap Pass: snowy pass bend and mountain outlook'},
  {curve: 2.1, enter:60, hold:120, leave:60, straight:280, rise:200, description:'Gold Rush Town: sandstone bend and western main street'},
  {curve: 2.4, enter:70, hold:120, leave:70, straight:240, rise:260, description:'Crystal Lake: lakeside bend and forest shore straight'},
  {curve:-3.2, enter:65, hold:110, leave:65, straight:240, rise:900, description:'Starlight Summit: summit bend and observatory approach'},
];
