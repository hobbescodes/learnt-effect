import { Config, Context, Effect, Schema } from "effect";

import { FetchError, JsonError } from "../errors";
import { Pokemon } from "../schemas";

// biome-ignore lint: who cares
import type { Array } from "effect";

// Point of this step is just to expand on the complexity, before introducing the need for `Layer`

class PokemonCollection extends Context.Tag("PokemonCollection")<
	PokemonCollection,
	Array.NonEmptyArray<string>
>() {
	static readonly Live = PokemonCollection.of([
		"staryu",
		"perrserker",
		"flaaffy",
	]);
}

class PokeApiUrl extends Context.Tag("PokeApiUrl")<PokeApiUrl, string>() {
	static readonly Live = Effect.gen(function* () {
		const baseUrl = yield* Config.string("BASE_URL");

		return PokeApiUrl.of(`${baseUrl}/pokemon`);
	});
}

class BuildPokeApiUrl extends Context.Tag("BuildPokeApiUrl")<
	BuildPokeApiUrl,
	({ name }: { name: string }) => string
>() {
	static readonly Live = Effect.gen(function* () {
		const pokeApiUrl = yield* PokeApiUrl; // create dependency

		return BuildPokeApiUrl.of(({ name }) => `${pokeApiUrl}/${name}`);
	});
}

// `make` is extracted to use `typeof` for the `PokeApi` service. This way you never have to manually keep the types in sync, and it can be inferred
const make = {
	getPokemon: Effect.gen(function* () {
		const pokemonCollection = yield* PokemonCollection; // create dependency
		const buildPokeApiUrl = yield* BuildPokeApiUrl; // create dependency

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
	static readonly Live = PokeApi.of(make);
}

const program = Effect.gen(function* () {
	const pokeApi = yield* PokeApi;

	return yield* pokeApi.getPokemon;
});

// Without `Layer` we are required to provide each service one by one
// `provideServiceEffect` is used to extract the service from an Effect (two of them below are defined using Effect.gen)
// What `Layer` allows us to do instead is to organize all dependencies and provide them only once (next step)
const liveProgram = program.pipe(
	Effect.provideService(PokeApi, PokeApi.Live),
	Effect.provideService(PokemonCollection, PokemonCollection.Live),
	Effect.provideServiceEffect(BuildPokeApiUrl, BuildPokeApiUrl.Live),
	Effect.provideServiceEffect(PokeApiUrl, PokeApiUrl.Live),
);

const main = liveProgram.pipe(
	Effect.catchTags({
		FetchError: () => Effect.succeed("Fetch error"),
		JsonError: () => Effect.succeed("Json error"),
		ParseError: () => Effect.succeed("Parse error"),
	}),
);

Effect.runPromise(main).then(console.log);
