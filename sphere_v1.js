// sphere_v1.js
// Working model of the sphere - v1
//
// Functionality - Done
// - Rotation
// - Depth
// - Highlight
// - Inertia
//
// Functionality - To Implement
// - Config Class
// - Gravity
// - Geo JSON


class Vector3 {
    constructor(x, y, z) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    multiplyScalar(scalar) {
        return new Vector3(this.x * scalar, this.y * scalar, this.z * scalar);
    }

    add(vector) {
        return new Vector3(this.x + vector.x, this.y + vector.y, this.z + vector.z);
    }

    subtract(vector) {
        return new Vector3(this.x - vector.x, this.y - vector.y, this.z - vector.z);
    }

    dot(vector) {
        return this.x * vector.x + this.y * vector.y + this.z * vector.z;
    }

    length() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    normalize() {
        const length = this.length();
        if (length === 0) return new Vector3(0, 0, 0);
        return new Vector3(this.x / length, this.y / length, this.z / length);
    }

    cross(vector) {
        return new Vector3(
            this.y * vector.z - this.z * vector.y,
            this.z * vector.x - this.x * vector.z,
            this.x * vector.y - this.y * vector.x
        );
    }

    static up() {
        return new Vector3(0, 1, 0);
    }

    static right() {
        return new Vector3(1, 0, 0);
    }

    static down() {
        return new Vector3(0, -1, 0);
    }
}

class Quaternion {
    constructor(x, y, z, w) {
        this.x = x;
        this.y = y;
        this.z = z;
        this.w = w;
    }

    multiply(quaternion) {
        return new Quaternion(
            this.w * quaternion.x + this.x * quaternion.w + this.y * quaternion.z - this.z * quaternion.y,
            this.w * quaternion.y - this.x * quaternion.z + this.y * quaternion.w + this.z * quaternion.x,
            this.w * quaternion.z + this.x * quaternion.y - this.y * quaternion.x + this.z * quaternion.w,
            this.w * quaternion.w - this.x * quaternion.x - this.y * quaternion.y - this.z * quaternion.z
        );
    }

    normalize() {
        const magnitude = Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z + this.w * this.w);
        if (magnitude === 0) return new Quaternion(0, 0, 0, 1);
        return new Quaternion(this.x / magnitude, this.y / magnitude, this.z / magnitude, this.w / magnitude);
    }

    conjugate() {
        return new Quaternion(-this.x, -this.y, -this.z, this.w);
    }

    static fromAxisAngle(axis, angle) {
        const halfAngle = angle / 2;
        const s = Math.sin(halfAngle);
        return new Quaternion(
            axis.x * s,
            axis.y * s,
            axis.z * s,
            Math.cos(halfAngle)
        );
    }
}

class Camera {
    constructor() {
        this.position = new Vector3(0, 0, 5); // Camera starts at (0, 0, 5)
        this.rotation = new Quaternion(0, 0, 0, 1); // No initial rotation
        this.projectionScale = 1000; // Projection scaling factor
        this.fixedDistance = 5; // Distance offset to avoid division by zero
    }

    rotate(deltaX, deltaY) {
        const rotationSpeed = 0.005; // Rotation speed factor
        const rotationY = Quaternion.fromAxisAngle(Vector3.up(), -deltaX * rotationSpeed);
        const rotationX = Quaternion.fromAxisAngle(Vector3.right(), deltaY * rotationSpeed);
        this.rotation = rotationY.multiply(this.rotation).multiply(rotationX).normalize();
    }

    project(vertex) {
        // Subtract the camera position from the vertex and rotate the result
        const rotated = this.rotateVector(vertex.subtract(this.position), this.rotation);
        const fixedDistance = 5;
        const scale = this.projectionScale / (this.projectionScale + rotated.z + fixedDistance);

        const x = rotated.x * scale;
        const y = rotated.y * scale;
        const z = rotated.z; // Keep the original z for depth sorting

        return new Vector3(x, y, z);
    }

    rotateVector(vector, quaternion) {
        const p = new Quaternion(vector.x, vector.y, vector.z, 0);
        const rotated = quaternion.multiply(p).multiply(quaternion.conjugate());
        return new Vector3(rotated.x, rotated.y, rotated.z);
    }
}

class Sphere {
    constructor(radius, latLines, lonLines) {
        this.radius = radius;
        this.latLines = latLines;
        this.lonLines = lonLines;
        this.vertices = [];
        this.createVertices();
    }

    createVertices() {
        this.vertices = [];
        // Loop through latitude lines
        for (let i = 0; i <= this.latLines; i++) {
            // Calculate the latitude angle (from -π/2 to π/2)
            const lat = (Math.PI / this.latLines) * i - Math.PI / 2;
            // Loop through longitude lines
            for (let j = 0; j <= this.lonLines; j++) {
                // Calculate the longitude angle (from 0 to 2π)
                const lon = (2 * Math.PI / this.lonLines) * j;
                // Convert spherical coordinates to Cartesian coordinates
                const x = this.radius * Math.cos(lat) * Math.cos(lon);
                const y = this.radius * Math.sin(lat);
                const z = this.radius * Math.cos(lat) * Math.sin(lon);
                // Add the vertex to the vertices array
                this.vertices.push(new Vector3(x, y, z));
            }
        }
    }
}

class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.context = canvas.getContext('2d');
        this.width = canvas.width = window.innerWidth;
        this.height = canvas.height = window.innerHeight;
    }

    clear() {
        this.context.clearRect(0, 0, this.width, this.height);
    }

    save() {
        this.context.save();
    }

    translate(x, y) {
        this.context.translate(x, y);
    }

    restore() {
        this.context.restore();
    }

    drawLine(x1, y1, x2, y2, color) {
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.strokeStyle = color;
        this.context.stroke();
    }

    drawCell(x1, y1, x2, y2, x3, y3, x4, y4, color, alpha) {
        this.context.beginPath();
        this.context.moveTo(x1, y1);
        this.context.lineTo(x2, y2);
        this.context.lineTo(x3, y3);
        this.context.lineTo(x4, y4);
        this.context.closePath();
        this.context.fillStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${alpha})`;
        this.context.fill();
    }
}

class InputHandler {
    constructor(canvas, app, sphere) {
        this.canvas = canvas;
        this.app = app;
        this.sphere = sphere;
        this.isDragging = false;
        this.previousMousePosition = { x: 0, y: 0 };
        this.velocity = new Vector3(0, 0, 0);
        this.lastTimestamp = 0;
        this.frameCounter = 0; // Add a frame counter

        canvas.addEventListener('mousedown', (event) => {
            this.isDragging = true;
            this.previousMousePosition = { x: event.clientX, y: event.clientY };
            this.lastTimestamp = event.timeStamp;
        });

        canvas.addEventListener('mousemove', (event) => {
            if (this.isDragging) {
                const deltaX = event.clientX - this.previousMousePosition.x;
                const deltaY = event.clientY - this.previousMousePosition.y;
                const deltaTime = event.timeStamp - this.lastTimestamp;
                this.app.camera.rotate(deltaX, deltaY);
                this.velocity = new Vector3(deltaX / deltaTime, deltaY / deltaTime, 0);
                this.previousMousePosition = { x: event.clientX, y: event.clientY };
                this.lastTimestamp = event.timeStamp;
            } else {
                this.highlightCell(event.clientX, event.clientY);
            }
        });

        canvas.addEventListener('mouseup', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('mouseleave', () => {
            this.isDragging = false;
        });

        canvas.addEventListener('wheel', (event) => {
            const zoomSpeed = 0.1;
            const zoomFactor = event.deltaY * zoomSpeed;
            this.app.camera.position.z += zoomFactor;
        });
    }

    highlightCell(mouseX, mouseY) {
        const rect = this.canvas.getBoundingClientRect();
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        // Transform mouse coordinates to canvas coordinates
        const canvasX = (mouseX - rect.left) * scaleX;
        const canvasY = (mouseY - rect.top) * scaleY;

        // Center the coordinates
        const x = canvasX - this.canvas.width / 2;
        const y = canvasY - this.canvas.height / 2;

        let closestDistance = Infinity;
        let closestCell = null;

        for (let i = 0; i < this.sphere.latLines; i++) {
            for (let j = 0; j < this.sphere.lonLines; j++) {
                const index1 = i * (this.sphere.lonLines + 1) + j;
                const index2 = i * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
                const index3 = (i + 1) * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
                const index4 = (i + 1) * (this.sphere.lonLines + 1) + j;

                const projected1 = this.app.camera.project(this.sphere.vertices[index1]);
                const projected2 = this.app.camera.project(this.sphere.vertices[index2]);
                const projected3 = this.app.camera.project(this.sphere.vertices[index3]);
                const projected4 = this.app.camera.project(this.sphere.vertices[index4]);

                if (!projected1 || !projected2 || !projected3 || !projected4) continue;

                // Ensure all projected points are in front of the camera and the cell is facing the camera
                if (projected1.z <= 0 && projected2.z <= 0 && projected3.z <= 0 && projected4.z <= 0) {
                    const centerX = (projected1.x + projected2.x + projected3.x + projected4.x) / 4;
                    const centerY = (projected1.y + projected2.y + projected3.y + projected4.y) / 4;
                    const distance = Math.sqrt(Math.pow(centerX - x, 2) + Math.pow(centerY - y, 2));

                    // Only consider cells on the near side for highlighting
                    if (distance < closestDistance) {
                        closestDistance = distance;
                        closestCell = { i, j };
                    }
                }
            }
        }

        this.highlightedCell = closestCell;
    }
}

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

        // Collect cells with their average z-depth and tag them
        const cells = [];
        for (let i = 0; i < this.sphere.latLines; i++) {
            for (let j = 0; j < this.sphere.lonLines; j++) {
                const index1 = i * (this.sphere.lonLines + 1) + j;
                const index2 = i * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
                const index3 = (i + 1) * (this.sphere.lonLines + 1) + (j + 1) % (this.sphere.lonLines + 1);
                const index4 = (i + 1) * (this.sphere.lonLines + 1) + j;

                const v1 = projectedVertices[index1];
                const v2 = projectedVertices[index2];
                const v3 = projectedVertices[index3];
                const v4 = projectedVertices[index4];

                const avgZ = (v1.z + v2.z + v3.z + v4.z) / 4;
                const isFarSide = avgZ > 0;

                cells.push({ v1, v2, v3, v4, avgZ, isFarSide });
            }
        }

        // Sort cells by their average z-depth (furthest first)
        cells.sort((a, b) => b.avgZ - a.avgZ);

        // Draw cells and lines
        for (const cell of cells) {
            const { v1, v2, v3, v4, isFarSide } = cell;

            if (isFarSide) {
                this.renderer.drawLine(v1.x, v1.y, v2.x, v2.y, '#778da9');
                this.renderer.drawLine(v2.x, v2.y, v3.x, v3.y, '#778da9');
                this.renderer.drawLine(v3.x, v3.y, v4.x, v4.y, '#778da9');
                this.renderer.drawLine(v4.x, v4.y, v1.x, v1.y, '#778da9');
            } else {
                this.renderer.drawLine(v1.x, v1.y, v2.x, v2.y, '#e0e1dd');
                this.renderer.drawLine(v2.x, v2.y, v3.x, v3.y, '#e0e1dd');
                this.renderer.drawLine(v3.x, v3.y, v4.x, v4.y, '#e0e1dd');
                this.renderer.drawLine(v4.x, v4.y, v1.x, v1.y, '#e0e1dd');
            }

            if (v1.z <= 0 && v2.z <= 0 && v3.z <= 0 && v4.z <= 0) {
                const distanceFromCamera = Math.sqrt(
                    Math.pow(this.camera.position.x - (v1.x + v2.x + v3.x + v4.x) / 4, 2) +
                    Math.pow(this.camera.position.y - (v1.y + v2.y + v3.y + v4.y) / 4, 2) +
                    Math.pow(this.camera.position.z - cell.avgZ, 2)
                );
                const alpha = Math.max(0, Math.min(1, 1 - distanceFromCamera / this.camera.position.z));
                this.renderer.drawCell(v1.x, v1.y, v2.x, v2.y, v3.x, v3.y, v4.x, v4.y, { r: 255, g: 255, b: 0 }, alpha);
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
            if (z1 <= 0 && z2 <= 0 && z3 <= 0 && z4 <= 0) {
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
