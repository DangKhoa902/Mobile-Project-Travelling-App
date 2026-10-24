import { toSearchText } from "./search-text.js";

type SearchSource = {
  name: string;
  location: string;
  address: string | null;
  category: { name: string } | null;
};

export const searchTextFor = (destination: SearchSource) =>
  toSearchText(destination.name, destination.location, destination.address, destination.category?.name);
