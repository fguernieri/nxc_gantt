# Deck Gantt for Nextcloud

![Deck Gantt Preview](img/app.svg)

**Deck Gantt** is a Nextcloud application that provides a powerful Gantt chart visualization for your [Nextcloud Deck](https://apps.nextcloud.com/apps/deck) boards. It allows you to plan your projects visually, manage dependencies, and track progress effortlessly.

## 🚀 Features

*   **Timeline Visualization**: View your Deck cards as tasks on an interactive timeline.
*   **Drag & Drop**: Easily adjust start and end dates by dragging tasks.
*   **Dependency Management**: Connect tasks with predecessor relationships (arrows) to visualize workflows.
*   **Task Editing**: Click any task to edit details, status, progress, and dependencies.
*   **Modern UI**: Built with Vue.js 3 and Vite for a smooth, responsive experience that matches Nextcloud's design.

## 🛠️ Installation

### Requirements
*   Nextcloud 27+
*   Nextcloud Deck App installed and enabled

### Easy Install (for Admins)

Please refer to [DEPLOY.md](DEPLOY.md) for detailed installation instructions on Docker and Production environments.

Basically, you need to clone this repository into your `custom_apps` folder:

```bash
cd nextcloud/apps
git clone https://github.com/fguernieri/nxc_gantt.git
```

And enable it via `occ` or the Web Interface.

## 💻 Development Setup

If you want to contribute or modify the frontend:

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server** (with mock data):
    ```bash
    npm run dev
    ```
    Access `http://localhost:5173` to see the changes in real-time.

3.  **Build for Production**:
    ```bash
    npm run build
    ```
    This generates the optimized `js/` and `css/` files required by Nextcloud.

## 🤝 Integration Status

Currently, this app uses a frontend-first approach.
*   **Frontend**: Complete (Vue 3, Gantt Logic, Interactions).
*   **Backend**: Basic scaffolding (PHP Controller).
*   **Status**: Ready for beta testing and manual deployment.

## 📝 License

This project is licensed under the AGPL-3.0 License.
