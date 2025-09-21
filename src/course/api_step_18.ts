import { Config, Context, Effect, Layer, Schema } from "effect";

import { FetchError, JsonError } from "./errors";
import { Pokemon } from "./schemas";

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

			// NB: note there is no need for `PokeApiUrl.of` as it is inferred from `Layer`
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

			// NB: note there is no need for `BuildPokeApiUrl.of` as it is inferred from `Layer`
			return ({ name }) => `${pokeApiUrl}/${name}`;
		}),
		// !NB: `BuildPokeApiUrl` has a dependency on `PokeApiUrl` as well, so we need to provide it directly here
		// We use `Layer.provide` when composing layers, and `Effect.provide` when providing the final layer to run effects
		// This `pipe` could also be applied at the `MainLayer` level on the service, but it is good practice to directly provide the required dependencies when defining a `Layer`
	).pipe(Layer.provide(PokeApiUrl.Live));
}

const make = {
	getPokemon: Effect.gen(function* () {
		const pokemonCollection = yield* PokemonCollection;
		const buildPokeApiUrl = yield* BuildPokeApiUrl;

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

class PokeApi extends Context.Tag("PokeApi")<PokeApi, typeof make>() {
	static readonly Live = Layer.succeed(this, make);
}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

const MainLayer = Layer.mergeAll(
	PokeApi.Live,
	PokemonCollection.Live,
	BuildPokeApiUrl.Live,
	PokeApiUrl.Live,
);

const liveProgram = program.pipe(Effect.provide(MainLayer));

const main = liveProgram.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
