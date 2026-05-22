let modInfo = {
	name: "Analytics Systems Tree",
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
	name: "Analytics Systems",
}

let changelog = `<h1>Changelog:</h1><br>
	<h3>v0.2</h3><br>
		- Reworked the dashboard data tree into relational algebra, data systems, table statistics, semantic models, business analytics, visualization grammars, and SIMD execution.<br>
	<h3>v0.1</h3><br>
		- Reworked the starter tree into dashboard data progressions.`

let winText = `Congratulations! Your rows now power the optimizer, semantic layer, dashboard, database, and vectorized executor.`

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
function tmpLayerEffect(layer, power = 1) {
	if (!tmp[layer] || !tmp[layer].effect) return new Decimal(1)
	return tmp[layer].effect.pow(power)
}

function rowEventSourceGain() {
	if (!tmp.row || !tmp.row.buyables || !tmp.row.buyables[12]) return new Decimal(0)
	if (!tmp.row.buyables[12].effect) return new Decimal(0)
	return tmp.row.buyables[12].effect
}

function getPointGen() {
	if(!canGenPoints())
		return new Decimal(0)

	let gain = new Decimal(1).add(rowEventSourceGain())
	if (player.row) gain = gain.times(tmpLayerEffect("row"))
	if (player.row && hasUpgrade("row", 12)) gain = gain.times(upgradeEffect("row", 12))
	if (player.rel) gain = gain.times(tmpLayerEffect("rel"))
	if (player.db) gain = gain.times(tmpLayerEffect("db", 1.25))
	if (player.exec) gain = gain.times(tmpLayerEffect("exec", 1.25))
	return gain
}

// You can add non-layer related variables that should go into "player" and be saved here, along with default values
function addedPlayerData() { return {
}}

// Display extra things at the top of the page
var displayThings = [
	function() {
		if (!player.row) return
		return "Events become rows, rows become relations, relations become schemas, schemas become catalogs, and catalogs become databases."
	},
	function() {
		if (!player.opt || !player.sem || !player.onto || !player.exec || !player.dist) return
		return "Plans: " + formatWhole(player.opt.points)
			+ " | Semantic layers: " + formatWhole(player.sem.points)
			+ " | Ontologies: " + formatWhole(player.onto.points)
			+ " | Distributed systems: " + formatWhole(player.dist.points)
			+ " | Executors: " + formatWhole(player.exec.points)
	},
]

// Determines when the game "ends"
function isEndgame() {
	return player.db && player.opt && player.dash && player.sem && player.onto && player.exec && player.dist
		&& player.db.points.gte(100)
		&& player.opt.points.gte(100)
		&& player.dash.points.gte(100)
		&& player.sem.points.gte(100)
		&& player.onto.points.gte(100)
		&& player.exec.points.gte(100)
		&& player.dist.points.gte(100)
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
