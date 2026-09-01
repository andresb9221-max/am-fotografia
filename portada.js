const grid = document.getElementById("albumes-grid");
const estado = document.getElementById("albumes-estado");
const hero = document.getElementById("hero-imagen");

function nombreEvento(valor) {
    return valor.replace(/[-_]+/g, " ").replace(/\b\w/g, letra => letra.toUpperCase()).replace(/\bIpn\b/g, "IPN").replace(/\b5k\b/gi, "5K").replace(/\b10k\b/gi, "10K");
}

function crearAlbum(album, indice) {
    const enlace = document.createElement("a");
    enlace.className = "album-card";
    enlace.href = `/fotos.html?evento=${encodeURIComponent(album.evento)}`;
    enlace.setAttribute("aria-label", `Abrir álbum ${nombreEvento(album.evento)}`);
    const imagen = document.createElement("div");
    imagen.className = "album-imagen";
    const img = document.createElement("img");
    img.src = album.portada;
    img.alt = `Portada de ${nombreEvento(album.evento)}`;
    img.loading = indice === 0 ? "eager" : "lazy";
    imagen.appendChild(img);
    const info = document.createElement("div");
    info.className = "album-info";
    const titulo = document.createElement("h3");
    titulo.textContent = nombreEvento(album.evento);
    const cantidad = document.createElement("p");
    cantidad.textContent = `${Number(album.total).toLocaleString("es-MX")} fotos`;
    info.append(titulo, cantidad);
    enlace.append(imagen, info);
    return enlace;
}

async function cargarAlbumes() {
    try {
        const respuesta = await fetch("/api/albumes");
        if (!respuesta.ok) throw new Error("No se pudieron cargar los álbumes");
        const albumes = await respuesta.json();
        grid.innerHTML = "";
        if (!albumes.length) {
            estado.textContent = "Próximamente encontrarás aquí nuestros nuevos eventos.";
            return;
        }
        albumes.forEach((album, indice) => grid.appendChild(crearAlbum(album, indice)));
        const imagenHero = document.createElement("img");
        imagenHero.src = albumes[0].portada;
        imagenHero.alt = "";
        hero.innerHTML = "";
        hero.appendChild(imagenHero);
    } catch (error) {
        grid.innerHTML = "";
        estado.textContent = "No pudimos cargar las galerías. Intenta nuevamente en unos minutos.";
    }
}

document.getElementById("anio").textContent = new Date().getFullYear();
cargarAlbumes();
