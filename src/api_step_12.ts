import { Config, Data, Effect, Schema } from "effect";

// TODO: learn more about `Config` and options
const config = Config.string("BASE_URL");

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

const decodePokemon = Schema.decodeUnknown(Pokemon);

const fetchRequest = (baseUrl: string) =>
	Effect.tryPromise({
		try: () => fetch(`${baseUrl}/pokemon/charmander/`),
		catch: () => new FetchError(),
	});

const jsonResponse = (response: Response) =>
	Effect.tryPromise({
		try: () => response.json(),
		catch: () => new JsonError(),
	});

// !NB: note that this now includes a `ConfigError`
// Since a missing configuration is an implementation error, it is common to *not* handle `ConfigError` and let the app fail
const program = Effect.gen(function* () {
	// NB: since extracting configuration is an effectful operation that may fail, this requires `yield*`
	const baseUrl = yield* config;

	const response = yield* fetchRequest(baseUrl);

	if (!response.ok) {
		return yield* new FetchError();
	}

	const json = yield* jsonResponse(response);

	return yield* decodePokemon(json);
});

const main = program.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
