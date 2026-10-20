declare module 'epg-parser' {
  export interface EpgParsedProgram {
    channel: string;
    start: string;
    stop: string;
    title: Array<{ lang?: string; value: string }> | string;
    desc?: Array<{ lang?: string; value: string }> | string;
    category?: Array<{ lang?: string; value: string }> | string;
    icon?: Array<{ src: string }> | string;
    [key: string]: any;
  }

  export interface EpgParsedChannel {
    id: string;
    name: Array<{ lang?: string; value: string }> | string;
    icon?: Array<{ src: string }> | string;
    [key: string]: any;
  }

  export interface EpgParseResult {
    channels: EpgParsedChannel[];
    programs: EpgParsedProgram[];
  }

  export function parse(content: string): EpgParseResult;
  const parser: {
    parse: (content: string) => EpgParseResult;
  };
  export default parser;
}
