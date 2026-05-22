var dashboardTree = [
	["gap-1", "gap-2", "row", "gap-3", "gap-4"],
	["alg", "stat", "rel", "fmt", "net", "simd"],
	["qry", "gap-5", "sch", "gap-6", "flight", "vec"],
	["exec", "ds", "cat", "panel", "gap-7"],
	["gap-8", "met", "db", "gap-9", "opt"],
	["gap-10", "sem", "gap-11", "gap-12", "gap-13", "gap-14"],
	["gap-15", "gap-16", "gap-17", "dash", "dist", "gap-18"],
	["gap-19", "onto", "gap-20", "gap-22", "gap-23", "gap-24"],
]

var layoutInfo = {
    startTab: "row",
    startNavTab: "tree-tab",
	showTree: true,

    treeLayout: dashboardTree
}

for (let index = 1; index <= 24; index++) {
	addNode("gap-" + index, {
		layerShown: "ghost",
	})
}

addLayer("tree-tab", {
    tabFormat: [["tree", function() {return (layoutInfo.treeLayout ? layoutInfo.treeLayout : TREE_LAYERS)}]],
    previousTab: "",
    leftTab: true,
    style() {return {'background-color': '#101417'}},
})
