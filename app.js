/**
 * STUDIO LARKSPUR — ARCHITECTURAL WALKTHROUGH & INTERACTIVE ENGINE
 * 
 * Features:
 * - Directional soft-edged wipe photo transitions traveling along walking vector
 * - SVG floor plan synchronization with route line tracing and brass room flooding from doorway
 * - Real-time scroll bi-directional tracking (scrolling back walks back)
 * - Distance rings radar interactivity
 * - Minimal consultation form handler with WhatsApp integration
 * - Mobile drawer & reduced motion accessibility
 */

(function () {
  'use strict';

  // Room metadata matching exact walking order and room dimensions
  const ROOMS = [
    {
      id: 'entrance',
      name: 'Entrance Foyer',
      number: '01 / 07',
      dimensions: "8' × 10' · 80 sq ft",
      materials: 'Quarter-sawn oak fluted wall panels, honed limestone floor',
      lighting: 'Concealed 2700K ceiling wash & solid brass entryway sconce',
      storage: 'Floor-to-ceiling concealed shoe credenza with brass recess pulls',
      doorCoords: { x: 200, y: 350 }, // Entrance lobby doorway
      wipeDirection: 'to right' // walking east into living
    },
    {
      id: 'living',
      name: 'Living Room',
      number: '02 / 07',
      dimensions: "16' × 14' · 224 sq ft",
      materials: 'Natural oak veneer wall cladding, lime plaster render #EEE9DF',
      lighting: 'Perimeter recessed warm LED cove & directional art wash',
      storage: 'Low-profile solid walnut media credenza with acoustic slat doors',
      doorCoords: { x: 280, y: 360 }, // Entry from foyer
      wipeDirection: 'to right' // walking east into dining
    },
    {
      id: 'dining',
      name: 'Dining Room',
      number: '03 / 07',
      dimensions: "10' × 10' · 100 sq ft",
      materials: 'Solid oak 6-seater dining table, fluted glass screen',
      lighting: 'Dual handmade terracotta & satin brass drop pendants',
      storage: 'Recessed walnut bar niche with brass stemware rack',
      doorCoords: { x: 600, y: 360 }, // Entry from living
      wipeDirection: 'to top' // walking north into kitchen
    },
    {
      id: 'kitchen',
      name: 'Modular Kitchen',
      number: '04 / 07',
      dimensions: "9' × 10' · 90 sq ft",
      materials: 'Fluted oak lower drawers, anti-fingerprint acrylic, quartz counters',
      lighting: 'Diffused under-cabinet 3000K task strips & track spotlighting',
      storage: 'Floor-to-ceiling pantry pull-outs with Blum soft-close mechanics',
      doorCoords: { x: 700, y: 260 }, // Entry from dining
      wipeDirection: 'to left' // walking west across corridor
    },
    {
      id: 'master',
      name: 'Master Bedroom',
      number: '05 / 07',
      dimensions: "14' × 12' · 168 sq ft",
      materials: 'Smoked oak wood flooring, fluted walnut bedhead with linen upholstery',
      lighting: 'Indirect warm ceiling trough & articulated brass reading arms',
      storage: 'Full-height 4-door wardrobe with natural woven cane inserts',
      doorCoords: { x: 380, y: 260 }, // Entry from hallway
      wipeDirection: 'to left' // walking west into kids room
    },
    {
      id: 'kids',
      name: "Kids' Room & Study",
      number: '06 / 07',
      dimensions: "11' × 10' · 110 sq ft",
      materials: 'Warm engineered birch ply joinery, washable lime wash paint',
      lighting: 'Dimmable flush-mount fixture & clamp-on brass desk luminaire',
      storage: 'Integrated study desk, modular bookshelf & under-bed drawers',
      doorCoords: { x: 200, y: 260 }, // Entry from hallway
      wipeDirection: 'to bottom' // walking south through living out to balcony
    },
    {
      id: 'balcony',
      name: 'Verandah Balcony',
      number: '07 / 07',
      dimensions: "16' × 6' · 96 sq ft",
      materials: 'Handmade geometric encaustic tiles, oil-treated teak slats',
      lighting: 'IP65-rated marine brass sconces & plant uplighting',
      storage: 'Built-in teak storage bench for potting supplies & cushions',
      doorCoords: { x: 440, y: 540 }, // Sliding door from living room
      wipeDirection: 'to bottom'
    }
  ];

  const totalStages = ROOMS.length + 1; // 1 Hero stage + 7 rooms = 8 stages

  // DOM Elements
  const walkContainer = document.getElementById('walkthrough') || document.getElementById('walkContainer');
  const heroOverlay = document.getElementById('heroOverlay');
  const hudContainer = document.getElementById('walkHud');
  const photoLayers = document.querySelectorAll('.walk-photo-layer');
  const routePath = document.getElementById('fpRoutePath');
  const beacon = document.getElementById('fpBeacon');

  // Navigation & Mobile Drawer Elements
  const navToggle = document.getElementById('navToggle');
  const mobileMenu = document.getElementById('mobileMenu');
  const mobileMenuClose = document.getElementById('mobileMenuClose');
  const mobileNavLinks = document.querySelectorAll('.mobile-nav-link');

  if (navToggle && mobileMenu) {
    navToggle.addEventListener('click', () => {
      mobileMenu.classList.add('open');
      mobileMenu.setAttribute('aria-hidden', 'false');
    });
  }

  if (mobileMenuClose && mobileMenu) {
    mobileMenuClose.addEventListener('click', () => {
      mobileMenu.classList.remove('open');
      mobileMenu.setAttribute('aria-hidden', 'true');
    });
  }

  mobileNavLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (mobileMenu) {
        mobileMenu.classList.remove('open');
        mobileMenu.setAttribute('aria-hidden', 'true');
      }
    });
  });

  // HUD text elements
  const hudIndex = document.getElementById('hudRoomIndex');
  const hudTitle = document.getElementById('hudRoomTitle');
  const hudDimensions = document.getElementById('hudRoomDimensions');
  const hudMaterials = document.getElementById('hudRoomMaterials');
  const hudLighting = document.getElementById('hudRoomLighting');
  const hudStorage = document.getElementById('hudRoomStorage');
  const chipButtons = document.querySelectorAll('.room-chip-btn');

  // Check reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Initialize Route Path length
  let routeTotalLength = 0;
  if (routePath) {
    try {
      routeTotalLength = routePath.getTotalLength();
      routePath.style.strokeDasharray = `${routeTotalLength} ${routeTotalLength}`;
      routePath.style.strokeDashoffset = `${routeTotalLength}`;
    } catch (e) {
      console.warn('Could not compute SVG path length', e);
    }
  }

  // Waypoints on SVG map for route beacon (center of each room in order)
  const roomWaypoints = [
    { x: 200, y: 360 }, // Foyer
    { x: 440, y: 400 }, // Living
    { x: 700, y: 360 }, // Dining
    { x: 700, y: 170 }, // Kitchen
    { x: 380, y: 140 }, // Master
    { x: 180, y: 160 }, // Kids
    { x: 440, y: 590 }  // Balcony
  ];

  let currentRoomIndex = -1;

  /**
   * Handle scroll-based walkthrough choreography
   */
  function handleWalkScroll() {
    if (!walkContainer) return;

    const rect = walkContainer.getBoundingClientRect();
    const containerTop = -rect.top;
    const totalScrollableHeight = rect.height - window.innerHeight;

    if (totalScrollableHeight <= 0) return;

    // Normalised overall progress [0 to 1]
    const overallProgress = Math.max(0, Math.min(1, containerTop / totalScrollableHeight));

    // Calculate stage (0 to 7)
    // Stage 0: 0 to 1/8 (Hero overview)
    // Stage 1 to 7: Room 1 to Room 7
    const stageFloat = overallProgress * (totalStages - 1);
    const activeStage = Math.min(Math.floor(stageFloat), totalStages - 1);
    const stageFraction = stageFloat - activeStage;

    // Stage 0 is Hero
    if (stageFloat < 0.85) {
      // Show hero title and promise, hide floor plan HUD
      if (heroOverlay) {
        heroOverlay.style.opacity = `${Math.max(0, 1 - stageFloat * 1.2)}`;
        heroOverlay.style.pointerEvents = stageFloat < 0.2 ? 'auto' : 'none';
      }
      if (hudContainer) {
        hudContainer.classList.remove('visible');
      }
    } else {
      // Fade out hero, reveal floor plan HUD
      if (heroOverlay) {
        heroOverlay.style.opacity = '0';
        heroOverlay.style.pointerEvents = 'none';
      }
      if (hudContainer) {
        hudContainer.classList.add('visible');
      }
    }

    // Determine current room index (0 to 6)
    let currentRoom = 0;
    if (stageFloat >= 0.85) {
      currentRoom = Math.min(Math.floor(stageFloat - 0.7), ROOMS.length - 1);
      currentRoom = Math.max(0, currentRoom);
    }

    if (currentRoom !== currentRoomIndex && stageFloat >= 0.85) {
      currentRoomIndex = currentRoom;
      updateRoomDetails(currentRoomIndex);
    }

    // Update photo layer transitions with directional soft-edged wipe
    updatePhotoLayers(stageFloat);

    // Update SVG floor plan: route line & brass flood
    updateFloorPlan(stageFloat);
  }

  /**
   * Update photo layers with soft-edged wipe masks
   */
  function updatePhotoLayers(stageFloat) {
    if (!photoLayers || photoLayers.length === 0) return;

    photoLayers.forEach((layer, idx) => {
      if (prefersReducedMotion) {
        // Fallback for reduced motion: clean opacity fade
        if (idx < stageFloat - 0.5) {
          layer.style.opacity = '0';
        } else if (idx > stageFloat + 0.5) {
          layer.style.opacity = '0';
        } else {
          const diff = 1 - Math.abs(stageFloat - idx);
          layer.style.opacity = `${Math.max(0, Math.min(1, diff))}`;
        }
        return;
      }

      // Normal motion: Directional soft wipe
      if (idx <= stageFloat) {
        // Layer is active or already uncovered below next layer
        layer.style.zIndex = idx + 10;
        layer.style.opacity = '1';

        // Clear mask if this layer is fully revealed below the active transition
        if (idx < Math.floor(stageFloat)) {
          layer.style.maskImage = 'none';
          layer.style.webkitMaskImage = 'none';
        }

        // Check if the next layer is wiping over this one
        const nextIdx = idx + 1;
        if (nextIdx < photoLayers.length && stageFloat >= idx && stageFloat < nextIdx + 1) {
          const progress = Math.max(0, Math.min(1, stageFloat - idx));
          const wipeDir = (idx < ROOMS.length) ? ROOMS[Math.min(idx, ROOMS.length - 1)].wipeDirection : 'to right';
          applySoftWipe(photoLayers[nextIdx], wipeDir, progress);
        }
      } else if (idx > stageFloat + 1) {
        // Completely hidden behind current stage
        layer.style.zIndex = 1;
        layer.style.opacity = '0';
        layer.style.maskImage = 'none';
        layer.style.webkitMaskImage = 'none';
      }
    });
  }

  /**
   * Apply directional soft-edged linear gradient wipe
   */
  function applySoftWipe(element, direction, progress) {
    if (!element) return;
    element.style.zIndex = 25;
    element.style.opacity = '1';

    // Feather bounds: soft 20% blur edge traveling across the frame
    const center = progress * 130 - 15; // from -15% to 115%
    const startFeather = Math.max(0, center - 18);
    const endFeather = Math.min(100, center + 18);

    const maskValue = `linear-gradient(${direction}, #000 0%, #000 ${startFeather}%, transparent ${endFeather}%, transparent 100%)`;
    element.style.maskImage = maskValue;
    element.style.webkitMaskImage = maskValue;
  }

  /**
   * Update floor plan SVG: Route line progress and brass room fill
   */
  function updateFloorPlan(stageFloat) {
    if (stageFloat < 0.8) {
      // In hero state: reset route line & room fills
      if (routePath && routeTotalLength > 0) {
        routePath.style.strokeDashoffset = `${routeTotalLength}`;
      }
      resetRoomFills();
      if (beacon) beacon.setAttribute('opacity', '0');
      return;
    }

    if (beacon) beacon.setAttribute('opacity', '1');

    // Progress through the rooms (0 to 1 across the 7 rooms)
    const walkProgress = Math.max(0, Math.min(1, (stageFloat - 0.8) / (totalStages - 1 - 0.8)));

    // Trace route line with strokeDashoffset
    if (routePath && routeTotalLength > 0) {
      const offset = routeTotalLength * (1 - walkProgress);
      routePath.style.strokeDashoffset = `${Math.max(0, offset)}`;
    }

    // Move beacon to current waypoint
    const roomFloat = walkProgress * (roomWaypoints.length - 1);
    const wpIdx = Math.min(Math.floor(roomFloat), roomWaypoints.length - 1);
    const nextWpIdx = Math.min(wpIdx + 1, roomWaypoints.length - 1);
    const wpFraction = roomFloat - wpIdx;

    const currentWp = roomWaypoints[wpIdx];
    const nextWp = roomWaypoints[nextWpIdx];

    const currentX = currentWp.x + (nextWp.x - currentWp.x) * wpFraction;
    const currentY = currentWp.y + (nextWp.y - currentWp.y) * wpFraction;

    if (beacon) {
      beacon.setAttribute('cx', `${currentX}`);
      beacon.setAttribute('cy', `${currentY}`);
    }

    // Brass floods the current room outward from its doorway
    const activeRoomIdx = Math.min(Math.floor(roomFloat), ROOMS.length - 1);
    const roomProgress = roomFloat - activeRoomIdx;

    ROOMS.forEach((room, idx) => {
      const poly = document.getElementById(`fp-poly-${room.id}`);
      const floodStop = document.getElementById(`flood-stop-${room.id}`);
      if (!poly) return;

      if (idx < activeRoomIdx) {
        // Visited room: soft settled warm tone
        poly.style.fill = 'rgba(176, 138, 74, 0.22)';
      } else if (idx === activeRoomIdx) {
        // Active room: brass expanding outward from doorway stop
        poly.style.fill = `url(#grad-flood-${room.id})`;
        if (floodStop) {
          const floodPercent = Math.min(100, Math.max(10, roomProgress * 110));
          floodStop.setAttribute('offset', `${floodPercent}%`);
        }
      } else {
        // Unvisited room: transparent
        poly.style.fill = 'transparent';
      }
    });
  }

  function resetRoomFills() {
    ROOMS.forEach(room => {
      const poly = document.getElementById(`fp-poly-${room.id}`);
      if (poly) poly.style.fill = 'transparent';
    });
  }

  /**
   * Update Room Narrative HUD card with details
   */
  function updateRoomDetails(index) {
    const room = ROOMS[index];
    if (!room) return;

    if (hudIndex) hudIndex.textContent = room.number;
    if (hudTitle) hudTitle.textContent = room.name;
    if (hudDimensions) hudDimensions.textContent = room.dimensions;
    if (hudMaterials) hudMaterials.textContent = room.materials;
    if (hudLighting) hudLighting.textContent = room.lighting;
    if (hudStorage) hudStorage.textContent = room.storage;

    // Update room chip button active state
    chipButtons.forEach((btn, i) => {
      if (i === index) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  /**
   * Jump to specific room on clicking room chip button
   */
  chipButtons.forEach((btn, i) => {
    btn.addEventListener('click', () => {
      if (!walkContainer) return;
      const rect = walkContainer.getBoundingClientRect();
      const containerTop = window.scrollY + rect.top;
      const totalScrollableHeight = rect.height - window.innerHeight;

      // Stage for room i starts at (1 + i)
      const targetStage = 1 + i;
      const targetScroll = containerTop + (targetStage / (totalStages - 1)) * totalScrollableHeight + 5;

      window.scrollTo({
        top: targetScroll,
        behavior: 'smooth'
      });
    });
  });

  // Sticky nav background change on scroll
  const siteNav = document.getElementById('siteNav');
  function handleNavScroll() {
    if (!siteNav) return;
    if (window.scrollY > 80) {
      siteNav.classList.add('scrolled');
    } else {
      siteNav.classList.remove('scrolled');
    }
  }

  // Mobile Plan Toggle
  const mobilePlanToggle = document.getElementById('mobilePlanToggle');
  const floorplanCard = document.querySelector('.floorplan-card');
  if (mobilePlanToggle && floorplanCard) {
    mobilePlanToggle.addEventListener('click', () => {
      const isVisible = floorplanCard.style.display !== 'none';
      floorplanCard.style.display = isVisible ? 'none' : 'block';
      mobilePlanToggle.textContent = isVisible ? 'Show Plan' : 'Hide Plan';
    });
  }

  // Distance Rings Radar Interaction
  const radarLegendRows = document.querySelectorAll('.ring-legend-row');
  const radarCircles = document.querySelectorAll('.radar-ring');

  radarLegendRows.forEach(row => {
    row.addEventListener('mouseenter', () => {
      const ringId = row.getAttribute('data-ring');
      highlightRing(ringId);
    });
    row.addEventListener('click', () => {
      const ringId = row.getAttribute('data-ring');
      highlightRing(ringId);
    });
  });

  function highlightRing(ringId) {
    radarLegendRows.forEach(r => {
      if (r.getAttribute('data-ring') === ringId) {
        r.classList.add('active');
      } else {
        r.classList.remove('active');
      }
    });

    radarCircles.forEach(circle => {
      if (circle.id === ringId) {
        circle.classList.add('highlighted');
      } else {
        circle.classList.remove('highlighted');
      }
    });
  }

  // Consultation Form Handler
  const consultationForm = document.getElementById('consultationForm');
  const formConfirmationMsg = document.getElementById('formConfirmationMsg');

  if (consultationForm) {
    consultationForm.addEventListener('submit', function (e) {
      e.preventDefault();

      const name = document.getElementById('clientName').value.trim();
      const contact = document.getElementById('clientContact').value.trim();
      const time = document.getElementById('clientTime').value.trim();

      if (!name || !contact || !time) {
        alert('Please fill in your name, contact details, and preferred time.');
        return;
      }

      // Display calm confirmation note
      consultationForm.style.display = 'none';
      if (formConfirmationMsg) {
        formConfirmationMsg.style.display = 'block';
        formConfirmationMsg.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }

      console.log('Consultation Request Submitted:', { name, contact, time });
    });
  }

  // Global scroll listener with requestAnimationFrame throttling
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        handleWalkScroll();
        handleNavScroll();
        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });

  // Initial call on load
  window.addEventListener('DOMContentLoaded', () => {
    handleWalkScroll();
    handleNavScroll();
  });

})();
