export type WineType = 'white' | 'red' | 'rose';
export type ProducerSweetness = 'dry' | 'semi_dry' | 'feinherb' | 'medium_sweet' | 'sweet';

export interface ScoreWeights {
  overall: number;
  taste: number;
  aftertaste: number;
  sweetnessLiking: number;
}

export interface RatingValues {
  overall: number;
  taste: number;
  aftertaste: number;
  sweetnessLiking: number;
  alcoholFeel: number;
}
