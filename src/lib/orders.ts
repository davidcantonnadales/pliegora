import type { quote } from "./pricing.mjs";
export type Order = {
  id: string;
  name: string;
  contact: string;
  fileName: string;
  created: string;
  status: string;
  price: ReturnType<typeof quote>;
  tokenHash: string;
};
