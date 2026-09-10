export type HouseReleaseAdminRow = {
  shareId: string;
  title: string;
  scope: 'album' | 'track';
  ownerId: string;
  ownerName: string;
  houseArtistId: string;
  houseArtistName: string;
  houseArtistSlug?: string;
  albumId?: string;
  trackId?: string;
  trackCount: number;
  live: boolean;
  houseLibraryNotice: boolean;
};
