"use client";

import { useEffect, useRef, useState } from "react";

interface Slide {
  icon: string;
  title: string;
  description: string;
}

const SLIDES: Slide[] = [
  {
    icon: "🎫",
    title: "Tickets de support",
    description: "Panneaux, catégories, formulaires, claim/transfert, salons vocaux à la demande, et des transcripts signés cryptographiquement à la fermeture.",
  },
  {
    icon: "📈",
    title: "Niveaux & XP",
    description: "XP textuel et vocal, cartes de rang générées en image, classement du serveur, rôles de récompense automatiques.",
  },
  {
    icon: "🛡️",
    title: "Sécurité anti-raid",
    description: "Détection de raid d'arrivées, anti-nuke, quarantaine, vérification, auto-modération, lockdown et sauvegardes — tout configurable depuis le dashboard.",
  },
  {
    icon: "🎵",
    title: "Musique en vocal",
    description: "Lecture depuis des liens directs, SoundCloud, Bandcamp, Twitch ou Vimeo, avec file d'attente, boucle et rôle DJ.",
  },
  {
    icon: "📋",
    title: "Candidatures de staff",
    description: "Formulaires personnalisés envoyés en DM, revue par rôle avec accepter/refuser en un clic.",
  },
  {
    icon: "🖼️",
    title: "Constructeur de messages",
    description: "Compose des embeds et boutons visuellement, avec aperçu en direct, puis envoie-les via le bot ou un webhook.",
  },
  {
    icon: "🏙️",
    title: "Jeu de rôle & économie",
    description: "Personnages, entreprises, véhicules, permis, bourse, braquages — tout un framework RP original.",
  },
];

const SLIDE_DURATION_MS = 5000;

export function FeatureSlideshow() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progressKey, setProgressKey] = useState(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (paused) return;
    timeoutRef.current = setTimeout(() => {
      setIndex((i) => (i + 1) % SLIDES.length);
      setProgressKey((k) => k + 1);
    }, SLIDE_DURATION_MS);
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [index, paused]);

  function goTo(i: number) {
    setIndex(i);
    setProgressKey((k) => k + 1);
  }

  return (
    <div className="slideshow" onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="slideshow-frame">
        {SLIDES.map((slide, i) => (
          <div key={slide.title} className={`slideshow-slide ${i === index ? "active" : ""}`} aria-hidden={i !== index}>
            <span className="slideshow-icon">{slide.icon}</span>
            <div className="slideshow-title">{slide.title}</div>
            <p className="slideshow-desc">{slide.description}</p>
          </div>
        ))}
      </div>

      <div className="slideshow-progress">
        <div key={progressKey} className="slideshow-progress-fill" style={{ animationPlayState: paused ? "paused" : "running" }} />
      </div>

      <div className="slideshow-dots">
        {SLIDES.map((slide, i) => (
          <button
            key={slide.title}
            type="button"
            className={`slideshow-dot ${i === index ? "active" : ""}`}
            aria-label={`Aller à la diapositive : ${slide.title}`}
            onClick={() => goTo(i)}
          />
        ))}
      </div>
    </div>
  );
}
