import { Data } from "effect";

// biome-ignore lint: who cares
export class FetchError extends Data.TaggedError("FetchError")<{}> {}
// biome-ignore lint: who cares
export class JsonError extends Data.TaggedError("JsonError")<{}> {}
