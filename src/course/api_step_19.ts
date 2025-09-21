import { Config, Context, Effect, Layer, Schema } from "effect";

import { FetchError, JsonError } from "../errors";
import { Pokemon } from "../schemas";

// biome-ignore lint: who cares
import type { Array } from "effect";

class PokemonCollection extends Context.Tag("PokemonCollection")<
	PokemonCollection,
	Array.NonEmptyArray<string>
>() {
	static readonly Live = Layer.succeed(this, [
		"staryu",
		"perrserker",
		"flaaffy",
	]);
}

class PokeApiUrl extends Context.Tag("PokeApiUrl")<PokeApiUrl, string>() {
	static readonly Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const baseUrl = yield* Config.string("BASE_URL");

			return `${baseUrl}/pokemon`;
		}),
	);
}

class BuildPokeApiUrl extends Context.Tag("BuildPokeApiUrl")<
	BuildPokeApiUrl,
	({ name }: { name: string }) => string
>() {
	static readonly Live = Layer.effect(
		this,
		Effect.gen(function* () {
			const pokeApiUrl = yield* PokeApiUrl;

			return ({ name }) => `${pokeApiUrl}/${name}`;
		}),
	).pipe(Layer.provide(PokeApiUrl.Live));
}

// This step changes dependency injection, by moving them outside of the `getPokemon` scope.
// Dependencies on the function level are useful when only 1 function needs them, but in practice, it is common to raise the dependency on the service since multiple functions will typically use the same dependency
// Steps applied:
// 1. Extract `pokemonCollection` and `buildPokeApiUrl` outside of `getPokemon`
// 2. Change the definition of the service `Context` to `Effect.Effect.Success<PokeApi>`
// 3. Since `make` is now an `Effect` we need to use `Layer.effect` instead of `Layer.succeed`
const make = Effect.gen(function* () {
	const pokemonCollection = yield* PokemonCollection;
	const buildPokeApiUrl = yield* BuildPokeApiUrl;

	return {
		getPokemon: Effect.gen(function* () {
			const requestUrl = buildPokeApiUrl({ name: pokemonCollection[0] });

			const response = yield* Effect.tryPromise({
				try: () => fetch(requestUrl),
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
		}),
	};
});

class PokeApi extends Context.Tag("PokeApi")<
	PokeApi,
	// NB: allows us to extract the success type from any Effect
	// This is needed because we want the service to contain the success methods, not the Effect used to create it
	Effect.Effect.Success<typeof make>
>() {
	static readonly Live = Layer.effect(this, make).pipe(
		// provide dependencies directly inside `Live`
		Layer.provide(Layer.mergeAll(PokemonCollection.Live, BuildPokeApiUrl.Live)),
	);
}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

// NB: now that we provided all dependencies at the services' level, we can simplify here. `program` only requirement is `PokeApi`
const MainLayer = Layer.mergeAll(PokeApi.Live);

const liveProgram = program.pipe(Effect.provide(MainLayer));

const main = liveProgram.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
