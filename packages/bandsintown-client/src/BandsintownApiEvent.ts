/** Raw event object shape from the Bandsintown public API. */
export interface BandsintownApiEvent {
  id: string | number;
  title?: string;
  url?: string;
  starts_at?: string;
  datetime?: string;
  ends_at?: string;
  sold_out?: boolean;
  lineup?: string[];
  venue?: {
    name?: string;
    city?: string;
    country?: string;
    location?: string;
    street_address?: string;
  };
  offers?: Array<{
    type?: string;
    url?: string;
    status?: string;
  }>;
}
