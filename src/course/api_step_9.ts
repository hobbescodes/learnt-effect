import { Data, Effect } from "effect";

// biome-ignore lint: who cares
class FetchError extends Data.TaggedError("FetchError")<{}> {}
// biome-ignore lint: who cares
class JsonError extends Data.TaggedError("JsonError")<{}> {}

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

	return yield* jsonResponse(response);
});

// Good practice to separate the implementation from error handling to focus on the logic when working on the above
// Most common / suggested way of doing error handling is to use `pipe` from the effect that is derived from `program`
const main = program.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
	}),
);

Effect.runPromise(main).then(console.log);
