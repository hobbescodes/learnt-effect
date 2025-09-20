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

// As we add more steps to pipe, the code becomes less readable and presents a different mental model
// const main = fetchRequest.pipe(
// 	Effect.filterOrFail(
// 		(response) => response.ok,
// 		() => new FetchError(),
// 	),
// 	Effect.flatMap(jsonResponse),
// 	Effect.catchTags({
// 		FetchError: () => Effect.succeed("Fetch error"),
// 		JsonError: () => Effect.succeed("Json error"),
// 	}),
// );

// Presents very similar to typical async/await typescript
// Note the missing catch tags (addressed in next step)
const main = Effect.gen(function* () {
	const response = yield* fetchRequest;

	if (!response.ok) {
		return yield* new FetchError();
	}

	return yield* jsonResponse(response);
});

Effect.runPromise(main).then(console.log);
