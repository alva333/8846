class SphereApp {
    constructor() {
        this.canvas = document.getElementById('sphereCanvas');
        this.renderer = new Renderer(this.canvas);
        this.sphere = new Sphere(Math.min(this.canvas.width, this.canvas.height) / 4, 18, 36);
        this.camera = new Camera();
        this.inputHandler = new InputHandler(this.canvas, this, this.sphere);
    }

    update() {
        if (!this.inputHandler.isDragging) {
            const rotationAxis = new Vector3(-this.inputHandler.velocity.y, this.inputHandler.velocity.x, 0);
            const rotationAngle = Math.sqrt(Math.pow(this.inputHandler.velocity.x, 2) + Math.pow(this.inputHandler.velocity.y, 2));
            if (rotationAngle > 0.0001) {
                const rotationQuaternion = Quaternion.fromAxisAngle(rotationAxis.normalize(), rotationAngle * 0.005);
                this.camera.rotation = rotationQuaternion.multiply(this.camera.rotation).normalize();
            }
            this.inputHandler.velocity = this.inputHandler.velocity.multiplyScalar(0.98);
            if (Math.abs(this.inputHandler.velocity.x) < 0.0001) this.inputHandler.velocity.x = 0;
            if (Math.abs(this.inputHandler.velocity.y) < 0.0001) this.inputHandler.velocity.y = 0;
        }
    }

    render() {
        this.renderer.clear();
        this.renderer.save();
        this.renderer.translate(this.canvas.width / 2, this.canvas.height / 2);

        const projectedVertices = this.sphere.vertices.map(vertex => this.camera.project(vertex)).filter(v => v !== null);

        // Sort vertices by their depth (z-coordinate)
        projectedVertices.sort((a, b) => b.z - a.z);

        for (let i = 0; i <= this.sphere.latLines; i++) {
            this.renderer.context.beginPath();
            for (let j = 0; j <= this.sphere.lonLines; j++) {
                const index = i * (this.sphere.lonLines + 1) + j;
                const { x, y, z } = projectedVertices[index];
                if (j === 0) this.renderer.context.moveTo(x, y);
                else this.renderer.context.lineTo(x, y);

                // Draw lines differently based on depth
                if (z < 0) {
                    this.renderer.context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                } else {
                    this.renderer.context.strokeStyle = 'red';
                }
                this.renderer.context.stroke();
                this.renderer.context.beginPath();
                this.renderer.context.moveTo(x, y);
            }
            this.renderer.context.stroke();
        }

        for (let j = 0; j <= this.sphere.lonLines; j++) {
            this.renderer.context.beginPath();
            for (let i = 0; i <= this.sphere.latLines; i++) {
                const index = i * (this.sphere.lonLines + 1) + j;
                const { x, y, z } = projectedVertices[index];
                if (i === 0) this.renderer.context.moveTo(x, y);
                else this.renderer.context.lineTo(x, y);

                // Draw lines differently based on depth
                if (z < 0) {
                    this.renderer.context.strokeStyle = 'rgba(0, 0, 0, 0.5)';
                } else {
                    this.renderer.context.strokeStyle = 'red';
                }
                this.renderer.context.stroke();
                this.renderer.context.beginPath();
                this.renderer.context.moveTo(x, y);
            }
            this.renderer.context.stroke();
        }

        for (let i = 0; i < this.sphere.latLines; i++) {
            for (let j = 0; j < this.sphere.lonLines; j++) {
                const index1 = i * (this.sphere.lonLines + 1) + j;
                const index2 = i * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
                const index3 = (i + 1) * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
                const index4 = (i + 1) * (this.sphere.lonLines + 1) + j;

                const { x: x1, y: y1, z: z1 } = projectedVertices[index1];
                const { x: x2, y: y2, z: z2 } = projectedVertices[index2];
                const { x: x3, y: y3, z: z3 } = projectedVertices[index3];
                const { x: x4, y: y4, z: z4 } = projectedVertices[index4];

                if (z1 >= 0 && z2 >= 0 && z3 >= 0 && z4 >= 0) {
                    const avgZ = (z1 + z2 + z3 + z4) / 4;
                    const distanceFromCamera = Math.sqrt(
                        Math.pow(this.camera.position.x - (x1 + x2 + x3 + x4) / 4, 2) +
                        Math.pow(this.camera.position.y - (y1 + y2 + y3 + y4) / 4, 2) +
                        Math.pow(this.camera.position.z - avgZ, 2)
                    );
                    const alpha = Math.max(0, Math.min(1, 1 - distanceFromCamera / this.camera.position.z));
                    this.renderer.drawCell(x1, y1, x2, y2, x3, y3, x4, y4, { r: 255, g: 255, b: 0 }, alpha);
                }
            }
        }

        if (this.inputHandler.highlightedCell) {
            const { i, j } = this.inputHandler.highlightedCell;
            const index1 = i * (this.sphere.lonLines + 1) + j;
            const index2 = i * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
            const index3 = (i + 1) * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
            const index4 = (i + 1) * (this.sphere.lonLines + 1) + j;
            const { x: x1, y: y1, z: z1 } = projectedVertices[index1];
            const { x: x2, y: y2, z: z2 } = projectedVertices[index2];
            const { x: x3, y: y3, z: z3 } = projectedVertices[index3];
            const { x: x4, y: y4, z: z4 } = projectedVertices[index4];
            if (z1 >= 0 && z2 >= 0 && z3 >= 0 && z4 >= 0) {
                this.renderer.drawCell(x1, y1, x2, y2, x3, y3, x4, y4, { r: 255, g: 255, b: 0 }, 0.3);
            }
        }

        this.renderer.restore();
    }

    gameLoop() {
        this.update();
        this.render();
        this.animationFrameId = requestAnimationFrame(() => this.gameLoop());
    }

    start() {
        this.gameLoop();
    }

    stop() {
        cancelAnimationFrame(this.animationFrameId);
    }
}

const app = new SphereApp();
app.start();
