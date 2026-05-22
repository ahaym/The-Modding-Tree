let modInfo = {
	name: "Esoteric Dashboard Data Tree",
	author: "nobody",
	pointsName: "events",
	modFiles: ["layers.js", "tree.js"],

	discordName: "",
	discordLink: "",
	initialStartPoints: new Decimal(10),
	offlineLimit: 1,
}

// Set your version in num and name
let VERSION = {
	num: "0.2",
	name: "Ontology Optimizer",
}

let changelog = `<h1>Changelog:</h1><br>
	<h3>v0.2</h3><br>
		- Reworked the dashboard data tree into ontologies, Codd algebra, query plans, table statistics, visualization grammars, and SIMD execution.<br>
	<h3>v0.1</h3><br>
		- Reworked the starter tree into dashboard data progressions.`

let winText = `Congratulations! Your tuples now commute through the optimizer, ontology, dashboard, database, and vectorized executor.`

// If you add new functions anywhere inside of a layer, and those functions have an effect when called, add them here.
// (The ones here are examples, all official functions are already taken care of)
var doNotCallTheseFunctionsEveryTick = ["blowUpEverything"]

function getStartPoints(){
    return new Decimal(modInfo.initialStartPoints)
}

// Determines if it should show points/sec
function canGenPoints(){
	return true
}

// Calculate points/sec!
function getPointGen() {
	if(!canGenPoints())
		return new Decimal(0)

	let gain = new Decimal(1)
	if (player.tup) gain = gain.times(player.tup.points.add(1))
	if (player.rel) gain = gain.times(player.rel.points.add(1))
	if (player.db) gain = gain.times(player.db.points.add(1).pow(2))
	if (player.exec) gain = gain.times(player.exec.points.add(1).pow(2))
	return gain
}

// You can add non-layer related variables that should go into "player" and be saved here, along with default values
function addedPlayerData() { return {
}}

// Display extra things at the top of the page
var displayThings = [
	function() {
		if (!player.tup) return
		return "Tuples become relations, relations become schemas, schemas become catalogs, and catalogs become databases."
	},
	function() {
		if (!player.opt || !player.sem || !player.exec) return
		return "Plans: " + formatWhole(player.opt.points)
			+ " | Semantic layers: " + formatWhole(player.sem.points)
			+ " | Executors: " + formatWhole(player.exec.points)
	},
]

// Determines when the game "ends"
function isEndgame() {
	return player.db && player.opt && player.dash && player.sem && player.exec
		&& player.db.points.gte(1)
		&& player.opt.points.gte(1)
		&& player.dash.points.gte(1)
		&& player.sem.points.gte(1)
		&& player.exec.points.gte(1)
}



// Less important things beyond this point!

// Style for the background, can be a function
var backgroundStyle = {
	"background-color": "#101417",
}

// You can change this if you have things that can be messed up by long tick lengths
function maxTickLength() {
	return(3600) // Default is 1 hour which is just arbitrarily large
}

// Use this if you need to undo inflation from an older version. If the version is older than the version that fixed the issue,
// you can cap their current resources with this.
function fixOldSave(oldVersion){
}
