export type WineType = 'white' | 'red' | 'rose';
export type ProducerSweetness = 'dry' | 'semi_dry' | 'feinherb' | 'medium_sweet' | 'sweet';

export interface Person { id: string; displayName: string; createdAt: string; updatedAt: string }
export interface Rating {
  id: string; wineId: string; personId: string; personName: string;
  overall: number; taste: number; aftertaste: number; sweetnessLiking: number; alcoholFeel: number;
  comment: string | null; personalScore: number; createdAt: string; updatedAt: string;
}
export interface Wine {
  id: string; name: string; wineType: WineType; winery: string | null; grapeVariety: string | null;
  photoPath: string | null; photoUrl: string | null; priceMinorUnits: number | null; vintage: number | null;
  country: string | null; region: string | null; alcoholAbv: number | null; producerSweetness: ProducerSweetness | null;
  notes: string | null; createdAt: string; updatedAt: string; groupScore: number | null; groupOverall: number | null;
  ratingCount: number; scopeScore: number | null; scopeOverall: number | null; scopeRatingCount: number;
}
export interface WineDetail extends Wine { ratings: Rating[]; detailUrl: string }
export interface WineInput {
  name: string; wineType: WineType; winery: string | null; grapeVariety: string | null;
  priceMinorUnits: number | null; vintage: number | null; country: string | null; region: string | null;
  alcoholAbv: number | null; producerSweetness: ProducerSweetness | null; notes: string | null;
}
export interface RatingInput { overall: number; taste: number; aftertaste: number; sweetnessLiking: number; alcoholFeel: number; comment: string | null }
