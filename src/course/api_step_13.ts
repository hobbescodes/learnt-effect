import { Config, Data, Effect, Schema } from "effect";

// Mainly a clean up step

// biome-ignore lint: who cares
class FetchError extends Data.TaggedError("FetchError")<{}> {}
// biome-ignore lint: who cares
class JsonError extends Data.TaggedError("JsonError")<{}> {}

class Pokemon extends Schema.Class<Pokemon>("Pokemon")({
	id: Schema.Number,
	order: Schema.Number,
	name: Schema.String,
	height: Schema.Number,
	weight: Schema.Number,
}) {}

const getPokemon = Effect.gen(function* () {
	const baseUrl = yield* Config.string("BASE_URL");

	const response = yield* Effect.tryPromise({
		try: () => fetch(`${baseUrl}/pokemon/charmander/`),
		catch: () => new FetchError(),
	});

	if (!response.ok) {
		return yield* new FetchError();
	}

	const json = yield* Effect.tryPromise({
		try: () => response.json(),
		catch: () => new JsonError(),
	});

	return yield* Schema.decodeUnknown(Pokemon)(json);
});

const main = getPokemon.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
