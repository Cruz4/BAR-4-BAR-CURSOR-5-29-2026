export type CollageCell = {
  url: string;
  className: string;
};

export type CollageLayout = {
  gridClass: string;
  rowCount: number;
  cells: CollageCell[];
};

const cell = (url: string, className = ''): CollageCell => ({ url, className });

/**
 * Square collage layouts for 1–9 covers. Every layout fills the frame — no empty grid cells.
 */
export function buildAlbumCoverCollageLayout(urls: string[]): CollageLayout | null {
  const images = urls.filter(Boolean).slice(0, 9);
  const n = images.length;
  if (n === 0) return null;

  switch (n) {
    case 1:
      return {
        gridClass: 'grid-cols-1',
        rowCount: 1,
        cells: [cell(images[0])],
      };

    case 2:
      return {
        gridClass: 'grid-cols-2',
        rowCount: 1,
        cells: [cell(images[0]), cell(images[1])],
      };

    case 3:
      return {
        gridClass: 'grid-cols-3',
        rowCount: 1,
        cells: images.map((url) => cell(url)),
      };

    case 4:
      return {
        gridClass: 'grid-cols-2',
        rowCount: 2,
        cells: images.map((url) => cell(url)),
      };

    case 5:
      return {
        gridClass: 'grid-cols-6',
        rowCount: 2,
        cells: [
          cell(images[0], 'col-span-3'),
          cell(images[1], 'col-span-3'),
          cell(images[2], 'col-span-2'),
          cell(images[3], 'col-span-2'),
          cell(images[4], 'col-span-2'),
        ],
      };

    case 6:
      return {
        gridClass: 'grid-cols-3',
        rowCount: 2,
        cells: images.map((url) => cell(url)),
      };

    case 7:
      return {
        gridClass: 'grid-cols-12',
        rowCount: 2,
        cells: [
          cell(images[0], 'col-span-4'),
          cell(images[1], 'col-span-4'),
          cell(images[2], 'col-span-4'),
          cell(images[3], 'col-span-3'),
          cell(images[4], 'col-span-3'),
          cell(images[5], 'col-span-3'),
          cell(images[6], 'col-span-3'),
        ],
      };

    case 8:
      return {
        gridClass: 'grid-cols-4',
        rowCount: 2,
        cells: images.map((url) => cell(url)),
      };

    case 9:
    default:
      return {
        gridClass: 'grid-cols-3',
        rowCount: 3,
        cells: images.map((url) => cell(url)),
      };
  }
}
