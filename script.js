let probmutazione = 0.2; // probabilità di mutazione ad ogni nascita nuova (20%)
let iterations = 6; // numero di iterazioni 

class animale {
    //definizione di un animale
    constructor(container, x, y, velocitamedia, erbivoro, aspettativa_vita, comportamento) {
        this.container = container;

        // Vettori fisici
        this.x = x; //posizione
        this.y = y;
        this.vx = 0; //velocità
        this.vy = 0;
        this.velocitamedia=velocitamedia;
        this.angle=0; //direzione di movimento
        this.keepangle = 0; //quanto mantenere la stessa direzione

        this.ne=esseri[0]; //essere più vicino

        // Caratteristiche
        this.regno = "animale";
        this.erbivoro = erbivoro; //è erbivoro o carnivoro?
        this.eta = 0; //età dell'animale
        this.aspettativa_vita = aspettativa_vita;
        this.comportamento = comportamento; //0 = ignora, 1 = fuga, 2 = inseguimento, 3 = misto


        // Implementazione/creazione nella pagina
        this.el = document.createElement("div");
        this.el.className = "animale" + this.erbivoro;
        container.appendChild(this.el);
        this.el.style.left = this.x + "px";
        this.el.style.top = this.y + "px";
    }

    update(dt) {
        // Aggiorna velocità in base al comportamento
        if(this.comportamento == 0) {
            if(--this.keepangle <= 0) {
                this.keepangle = Math.floor(Math.random() * 50) + 1;
                this.angle += Math.random() * 2 - 1;
            }
        }else if(this.comportamento == 1) {
            this.angle=Math.atan2(this.ne.y - this.y, this.ne.x - this.x)*180 / Math.PI +180;
        }else if(this.comportamento == 2) {
            this.angle=Math.atan2(this.ne.y - this.y, this.ne.x - this.x)*180 / Math.PI;
        }else if(this.comportamento == 3) {
            // Implementazione per il comportamento misto
            if((this.ne.regno === "piante" && this.erbivoro) || (this.ne.regno === "animale" && !this.erbivoro && this.ne.erbivoro)) {
                this.angle=Math.atan2(this.ne.y - this.y, this.ne.x - this.x)*180 / Math.PI;
            }else if(this.ne.regno === "animale" && this.erbivoro && !this.ne.erbivoro){
                this.angle=Math.atan2(this.ne.y - this.y, this.ne.x - this.x)*180 / Math.PI +180;
            }else{
                if(--this.keepangle <= 0) {
                this.keepangle = Math.floor(Math.random() * 50) + 1;
                this.angle += Math.random() * 2 - 1;
                } 
            }
        }
        this.vx = Math.cos(this.angle) * this.velocitamedia;
        this.vy = Math.sin(this.angle) * this.velocitamedia;

        // Aggiorna posizione
        this.x += this.vx * dt;
        this.y += this.vy * dt;

        
        const w = this.el.offsetWidth;
        const h = this.el.offsetHeight;


        // Bordo destro/sinistro
        
        if (this.x < 0) { this.x = 0; this.vx *= -1; }
        if (this.x > this.container.clientWidth - w) {
            this.x = this.container.clientWidth - w; this.vx *= -1;
        }

        // Bordo alto/basso
        
        if (this.y < 0) { this.y = 0; this.vy *= -1; }
        if (this.y > this.container.clientHeight - h) {
            this.y = this.container.clientHeight - h; this.vy *= -1;
        }

        // Aggiorna pagina con nuova posizione
        this.el.style.left = this.x + "px";
        this.el.style.top = this.y + "px";

        if(++this.eta > this.aspettativa_vita) {
            // Rimuovi l'animale se ha superato la sua aspettativa di vita
            this.container.removeChild(this.el);
            esseri.splice(esseri.indexOf(this), 1);
        }
    }
}

class pianta {
    //definizione di una pianta
    constructor(container, x, y, aspettativa_vita) {
        this.container = container;

        // Vettori fisici
        this.x = x; //posizione
        this.y = y;

        this.ne;
        
        // Caratteristiche
        this.regno = "piante";
        this.eta = 0; //età 
        this.aspettativa_vita = aspettativa_vita;
        
        // Implementazione/creazione nella pagina
        this.el = document.createElement("div");
        this.el.className = "piante";
        container.appendChild(this.el);
        this.el.style.left = this.x + "px";
        this.el.style.top = this.y + "px";
    }
    update(dt) {
        if(++this.eta > this.aspettativa_vita) {
            // Rimuovi se ha superato la sua aspettativa di vita
            this.container.removeChild(this.el);
            esseri.splice(esseri.indexOf(this), 1);
        }
    }
}



function createChild(G){
    let F=G; //figlio che eredita le caratteristiche del genitore
    if(Math.random() < probmutazione) {
        let scelta=Math.floor(Math.random() * 4); //scelta casuale tra 4 caratteristiche da mutare
        if(scelta === 0) {
            F.velocitamedia += (Math.random() * 0.4 - 0.2); //mutazione: variazione casuale della velocità
        }else
        if(scelta === 1) {
            //F.erbivoro = !F.erbivoro; //mutazione: cambia dieta (questa mutazione è più drastica, quindi la commento per evitare cambiamenti troppo rapidi)
        }else 
        if(scelta === 2) {
            F.comportamento = (F.comportamento + 1) % 4; //mutazione: cambia comportamento
        }else
        if(scelta === 3) {
            F.aspettativa_vita += (Math.random() * 200 - 100); //mutazione: variazione casuale dell'aspettativa di vita
        }
    }
    esseri.push(
        new animale(         //passa le stesse caratteristiche del genitore
        container,
        F.x + 20, F.y,     //posizione leggermente spostata rispetto al genitore
        F.velocitamedia,
        F.erbivoro,
        F.aspettativa_vita,
        F.comportamento
        )
    );
}


// controllo collisione tra 2 esseri (SIMMETRICO e basato sui CENTRI)
function checkCollision(b1, b2) {
  // dimensioni reali
  const w1 = b1.el.offsetWidth,  h1 = b1.el.offsetHeight;
  const w2 = b2.el.offsetWidth,  h2 = b2.el.offsetHeight;

  // centri
  const c1x = b1.x + w1 / 2, c1y = b1.y + h1 / 2;
  const c2x = b2.x + w2 / 2, c2y = b2.y + h2 / 2;

  const dx = c2x - c1x;
  const dy = c2y - c1y;
  const dist = Math.hypot(dx, dy);

  // raggi (se sono “cerchi” disegnati quadrati, uso r = min(w,h)/2)
  const r1 = Math.min(w1, h1) / 2;
  const r2 = Math.min(w2, h2) / 2;
  const minDist = r1 + r2;

  if (dist <= minDist) {
    // --- ANIMALE <-> PIANTA (in qualsiasi ordine) ---
    if (b1.regno === "animale" && b2.regno === "piante") {
      if (b1.erbivoro) {
        container.removeChild(b2.el);
        esseri.splice(esseri.indexOf(b2), 1);
        createChild(b1);
      }
    } else if (b2.regno === "animale" && b1.regno === "piante") {
      if (b2.erbivoro) {
        container.removeChild(b1.el);
        esseri.splice(esseri.indexOf(b1), 1);
        createChild(b2);
      }
    }
    // --- ANIMALE <-> ANIMALE ---
    else if (b1.regno === "animale" && b2.regno === "animale") {
      // carnivoro mangia erbivoro (in qualsiasi ordine)
      if (!b1.erbivoro && b2.erbivoro) {
        container.removeChild(b2.el);
        esseri.splice(esseri.indexOf(b2), 1);
        createChild(b1);
      } else if (!b2.erbivoro && b1.erbivoro) {
        container.removeChild(b1.el);
        esseri.splice(esseri.indexOf(b1), 1);
        createChild(b2);
      } else {
        // urto semplice (swap velocità) - opzionale
        // const tmpVx = b1.vx, tmpVy = b1.vy;
        // b1.vx = b2.vx; b1.vy = b2.vy;
        // b2.vx = tmpVx; b2.vy = tmpVy;
      }
    }
  }else{
    //se non in collisione, ritorno la distanza
    return dist;
  }
}

const container = document.getElementById("container");
let esseri = [];

let frameTime = 20; // ms tra un frame e l'altro
let framecounter = 0;

function animate() {
    let dt = 1; // per semplicità della simulazione, consideriamo dt 1 per ogni frame (replicando il passo 1 di tempo)

    // Controllo collisioni
    for (let i = 0; i < esseri.length; i++) {
        let distmin = Infinity;
        for (let j = i + 1; j < esseri.length; j++) {
            let dist = checkCollision(esseri[i], esseri[j]);
            if (dist < distmin) {
                distmin = dist;
                esseri[i].ne = esseri[j];
                esseri[j].ne = esseri[i];
            }
        }
    }

    // Aggiorna ogni pallina
    esseri.forEach(e => e.update(dt));

    if(framecounter++ % 100 === 0) {
        // Ogni 100 frame, aggiungo una nuova pianta
        esseri.push(new pianta(container, Math.random() * (container.clientWidth - 20), Math.random() * (container.clientHeight - 20), 3000));
    }

    frameTime = 200-document.getElementById("slider").value;
    setTimeout(animate, frameTime);
}

for (let i = 0; i < iterations; i++){
    animate();
}

function removeEssere() {
    const e = esseri.pop();
    if (e) container.removeChild(e.el);
}

function pace(){
    for (let i = 0; i < esseri.length; i++){
        if(esseri[i].regno === "animale" && !esseri[i].erbivoro){
            container.removeChild(esseri[i].el);
            esseri.splice(esseri.indexOf(esseri[i]), 1);
        }
    }
}

let lastframecounter = 0;
function stats() {
    const numPiante = esseri.filter(e => e.regno === "piante").length;
    const numAnimali = esseri.filter(e => e.regno === "animale").length;
    const numErbivori = esseri.filter(e => e.regno === "animale" && e.erbivoro).length;
    const velocitamedia = (esseri.filter(e => e.regno === "animale").reduce((sum, e) => sum + e.velocitamedia, 0) / numAnimali).toFixed(2);
    const aspettativavita = (esseri.filter(e => e.regno === "animale").reduce((sum, e) => sum + e.aspettativa_vita, 0) / numAnimali).toFixed(2);
    const comportamentoCounts = [0, 0, 0, 0];
    esseri.filter(e => e.regno === "animale").forEach(e => comportamentoCounts[e.comportamento]++);
    const comportamento = comportamentoCounts.map((count, i) => `Intelligenza ${i}: ${count}`).join(", ");
    const sps = ((framecounter - lastframecounter) / 0.5).toFixed(2);
    lastframecounter = framecounter;
    
    document.getElementById("tempo").textContent = "Tempo: " + framecounter +" steps (" + sps + " steps/s)";
    document.getElementById("numPiante").textContent = "Piante: " + numPiante;
    document.getElementById("numAnimali").textContent = "Animali: " + numAnimali;
    document.getElementById("numErbivori").textContent = "Erbivori: " + numErbivori;
    document.getElementById("velocitamedia").textContent = "Velocita' media: " + velocitamedia;
    document.getElementById("aspettativavita").textContent = "Aspettativa di vita media: " + aspettativavita;
    document.getElementById("comportamento").textContent = comportamento;

    setTimeout(stats, 500);
}
stats();


// Creazione iniziale
esseri.push(new animale(container, Math.random() * (container.clientWidth - 20), Math.random() * (container.clientHeight - 20), 1, true, 2000, 0));
esseri.push(new animale(container, Math.random() * (container.clientWidth - 20), Math.random() * (container.clientHeight - 20), 1.7, false, 1000, 0));
esseri.push(new pianta(container, Math.random() * (container.clientWidth - 20), Math.random() * (container.clientHeight - 20), 3000));