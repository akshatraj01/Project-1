# 🔍 Dijkstra Algorithm Visualizer

An interactive web application that demonstrates the working of **Dijkstra’s Algorithm** for finding the shortest path in a graph.

Users can dynamically create their own graph by adding nodes and edges, then visualize how the algorithm computes the shortest path step by step.

---

## ✨ Features

*  Add any number of nodes
*  Connect nodes with weighted edges
*  Choose source node
*  Drag nodes around freely to rearrange the graph
*  Real-time shortest path calculation
*  Visual representation of the shortest path
*  Speed slider — control animation speed
*  Clear / Load Example buttons

---

## 🛠️ Tech Stack

* HTML
* CSS
* JavaScript

---

## 📖 About Dijkstra’s Algorithm

Dijkstra’s Algorithm is a greedy algorithm used to find the shortest path between nodes in a graph with non-negative weights.

### Steps:

1. Initialize distances (0 for source, ∞ for others)
2. Visit the nearest unvisited node
3. Update distances to neighboring nodes
4. Repeat until all nodes are processed

This project visually demonstrates these steps in an interactive way.

---

## 💻 How to Use

1. Add nodes to the graph
2. Connect nodes using edges with weights
3. Select the starting node
4. Run the algorithm
5. View the shortest path result visually

---

## 📂 Project Structure

```id="c0qz7h"
/project-folder
│── index.html
│── style.css
│── script.js
```

---

## 🙋‍♂️ Author

Akshat Raj

---

## 📌 Future Improvements

- 🔄 Add real-time animation for step-by-step execution of Dijkstra’s Algorithm  
- 📊 Visual highlight of visited nodes with time-based progression    
- 💾 Save and load custom graphs using JSON/local storage  
- 🧠 Add comparison with other shortest path algorithms (BFS, Bellman-Ford) 
