import { Data, Effect, Schema } from "effect";

// biome-ignore lint: who cares
class FetchError extends Data.TaggedError("FetchError")<{}> {}
// biome-ignore lint: who cares
class JsonError extends Data.TaggedError("JsonError")<{}> {}

// NB: with `Schema.Struct` we dont get an opaque type. Check type of `program` for reference
const Pokemon = Schema.Struct({
	id: Schema.Number,
	order: Schema.Number,
	name: Schema.String,
	height: Schema.Number,
	weight: Schema.Number,
});

// Takes any `unknown` value and returns an `Effect<Pokemon, ParseError>`
const decodePokemon = Schema.decodeUnknown(Pokemon);

const fetchRequest = Effect.tryPromise({
	try: () => fetch("https://pokeapi.co/api/v2/pokemon/charmander/"),
	catch: () => new FetchError(),
});

const jsonResponse = (response: Response) =>
	Effect.tryPromise({
		try: () => response.json(),
		catch: () => new JsonError(),
	});

const program = Effect.gen(function* () {
	const response = yield* fetchRequest;

	if (!response.ok) {
		return yield* new FetchError();
	}

	const json = yield* jsonResponse(response);

	// NB: remember to add `yield*` since schema validation is an effectful operation that may fail
	return yield* decodePokemon(json);
});

const main = program.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		// Since we introduced a new `ParseError` we need to handle it here
		// Best part here is that you can adjust `program`, check its type to inspect what may go wrong, and handle everything that is needed here
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
