export interface IOptions {
    dotsAllowed: boolean;
}
/**
 * $timeSignatureName is a string like "4/4" or "6/8".
 *
 * A $song is a string in a song where $barLength divisions make up a bar.
 * A full $song is made up of $barLength characters.
 * The string contains three kinds of characters.
 *  - 'r': The start of a beat
 *  - '_': The continuation of a beat
 *  - '.': A note
 *
 * See README.md for examples / tests.
 */
export default function checkRests(timeSignatureName: string, barLength: number, song: string, options: IOptions): string;
