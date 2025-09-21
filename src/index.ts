import { Effect, Layer } from "effect";

import { PokeApi } from "./services";

const MainLayer = Layer.mergeAll(PokeApi.Default);

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
}).pipe(Effect.provide(MainLayer));

const main = program.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
