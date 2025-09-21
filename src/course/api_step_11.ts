import { Data, Effect, Schema } from "effect";

// biome-ignore lint: who cares
class FetchError extends Data.TaggedError("FetchError")<{}> {}
// biome-ignore lint: who cares
class JsonError extends Data.TaggedError("JsonError")<{}> {}

// Using a class allows us to define the shape and export an opaque type at the same time
// The type parameter should be the same as the class name
// the string parameter is the `_tag` of the schema
// The second parameter is the shape of the schema
// Can be used directly as a type
// Now that it is a class, we could also attach methods to it
// NB: cannot be used for non-object schemas, like union types or primitive types
class Pokemon extends Schema.Class<Pokemon>("Pokemon")({
	id: Schema.Number,
	order: Schema.Number,
	name: Schema.String,
	height: Schema.Number,
	weight: Schema.Number,
}) {}

const decodePokemon = Schema.decodeUnknown(Pokemon);

const fetchRequest = Effect.tryPromise({
	// NB: note that this is still hardcoded.
	// How do we change for testing?
	// We don't want to copy pasta every time
	// Hard to refactor if the url changes for whatever reason
	// Will resolve in following steps
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
