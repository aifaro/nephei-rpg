# -*- coding: utf-8 -*-
"""Investigadores pregenerados de La maldición del Palacio de Linares (7.ª edición).

Solo van las habilidades que difieren de la base; las demás las pone generar.py.
Si cambias algo aquí, cámbialo también en aventura.html (#pregenerados) y en sinopsis.html.
"""

PERSONAJES = [
    {
        'slug': 'elena-arrieta',
        'nombre': 'Elena Arrieta',
        'ocupacion': 'Estudiante de Ciencias',
        'genero': 'Mujer', 'edad': 23,
        'residencia': 'Residencia de Señoritas',
        'nacimiento': 'Bilbao',
        'car': {'FUE': 45, 'CON': 55, 'TAM': 50, 'DES': 70, 'APA': 65, 'INT': 80, 'POD': 65, 'EDU': 70},
        'suerte': 60,
        'hab': {
            'Buscar libros': 70, 'Ciencia (Química)': 50, 'Crédito': 20, 'Descubrir': 60,
            'Encanto': 45, 'Esquivar': 45, 'Historia': 35, 'Otras lenguas (Latín)': 50,
            'Otras lenguas (Inglés)': 45, 'Primeros auxilios': 45, 'Psicología': 35, 'Saltar': 40,
        },
        'armas': [],
        'equipo': ['Bolso', 'Cuaderno de laboratorio', 'Cerillas y velas', 'Una lupa'],
        'descripcion': 'Alta y delgada, gafas redondas, las manos con manchas de ácido que no se van.',
        'ideologia': 'La ciencia acabará explicándolo todo. Los fantasmas son mala química y peor imaginación.',
        'allegados': 'Su tío Esteban, que le paga los estudios y no se olvida de recordárselo.',
        'lugares': 'El laboratorio Foster de la Residencia, recién inaugurado, donde pasa más horas que en su cuarto.',
        'posesiones': 'Un microscopio de latón que fue de su madre.',
        'rasgos': 'Terca. No soporta que la llamen «señorita» con ese tono.',
        'trasfondo': 'Sobrina de don Esteban. Lee latín con soltura, discute con todo el mundo y no cree en fantasmas, todavía.',
        'motivo': 'Su tío le ha pedido que acompañe al grupo «para que alguien de la familia esté presente». '
                  'Ella ha aceptado porque quiere demostrar que no hay nada que explicar, salvo las cañerías.',
    },
    {
        'slug': 'julia-ortega',
        'nombre': 'Julia Ortega',
        'ocupacion': 'Médica de la Casa de Socorro',
        'genero': 'Mujer', 'edad': 45,
        'residencia': 'Calle de Hortaleza, Madrid',
        'nacimiento': 'Valladolid',
        'car': {'FUE': 50, 'CON': 60, 'TAM': 55, 'DES': 55, 'APA': 55, 'INT': 75, 'POD': 60, 'EDU': 85},
        'suerte': 45,
        'hab': {
            'Buscar libros': 45, 'Ciencia (Farmacia)': 45, 'Ciencia (Biología)': 40, 'Crédito': 40,
            'Descubrir': 40, 'Esquivar': 30, 'Medicina': 65, 'Otras lenguas (Latín)': 55,
            'Persuasión': 45, 'Primeros auxilios': 65, 'Psicología': 55,
        },
        'armas': [('Bisturí', 25, '1D4+BD', 'Contacto', '1', '—', '—')],
        'equipo': ['Maletín de médico', 'Vendas y láudano', 'Bisturí', 'Sales', 'Linterna eléctrica'],
        'descripcion': 'Pelo gris recogido, abrigo negro de viuda, un olor a fenol que la sigue a todas partes.',
        'ideologia': 'Cada enfermo merece lo mismo, pague o no pague.',
        'allegados': 'Su marido, también médico, al que se llevó la gripe de 1918.',
        'lugares': 'La Casa de Socorro de Buenavista a las tres de la mañana, cuando entran los casos de verdad.',
        'posesiones': 'El reloj de bolsillo de su marido, que adelanta dos minutos.',
        'rasgos': 'Cuando algo no tiene explicación, se calla y toma notas.',
        'trasfondo': 'Una de las pocas médicas de Madrid. Viuda, cansada y meticulosa; se licenció en San Carlos '
                     'sin que nadie le regalara nada y no se asusta con facilidad.',
        'motivo': 'Atendió a doña Gabriela Montalvo, la última inquilina del palacio, antes de que la internaran. '
                  'Lo que aquella mujer le contó entre sollozos no le ha dejado dormir tranquila. '
                  'Cuando supo que don Esteban buscaba gente, se ofreció.',
    },
    {
        'slug': 'pilar-lozano',
        'nombre': 'Pilar Lozano',
        'ocupacion': 'Telegrafista del turno de noche',
        'genero': 'Mujer', 'edad': 27,
        'residencia': 'Calle del Ave María, Lavapiés',
        'nacimiento': 'Zaragoza',
        'car': {'FUE': 45, 'CON': 60, 'TAM': 55, 'DES': 65, 'APA': 60, 'INT': 70, 'POD': 60, 'EDU': 60},
        'suerte': 55,
        'hab': {
            'Buscar libros': 40, 'Crédito': 15, 'Descubrir': 55, 'Electricidad': 50, 'Encanto': 50,
            'Escuchar': 65, 'Esquivar': 40, 'Mecánica': 35, 'Otras lenguas (Francés)': 30,
            'Persuasión': 40, 'Psicología': 35, 'Sigilo': 40,
        },
        'armas': [],
        'equipo': ['Bolso con alicates', 'Cinta aislante', 'Fusibles de repuesto', 'Linterna eléctrica',
                   'Gemelos de teatro'],
        'descripcion': 'Menuda, pelo corto a la moda, una cinta de telégrafo enrollada en la muñeca como si fuera una pulsera.',
        'ideologia': 'Una mujer puede ganarse la vida igual que un hombre, y cobrar lo mismo; eso último aún no lo ha conseguido.',
        'allegados': 'Su padre, guardafrenos jubilado en Zaragoza, al que manda dinero cada mes.',
        'lugares': 'La sala de aparatos del Palacio de Comunicaciones, de madrugada, con la plaza vacía al otro lado del cristal.',
        'posesiones': 'Los gemelos de teatro que se compró con su primer sueldo.',
        'rasgos': 'Curiosa hasta la imprudencia. Si algo se rompe, lo arregla.',
        'trasfondo': 'Hija de un guardafrenos de la línea de Zaragoza. Rápida, curiosa y con buen oído; '
                     'sabe arreglar casi cualquier cosa que lleve cables.',
        'motivo': 'Trabaja en el Palacio de Comunicaciones, justo enfrente del Palacio de Linares. Varias noches, '
                  'con la casa vacía, ha visto luz en una ventana, y una vez una cara pálida detrás del cristal. '
                  'Fue ella quien escribió a don Esteban.',
    },
    {
        'slug': 'ramon-valcarcel',
        'nombre': 'Ramón Valcárcel',
        'ocupacion': 'Reportero de El Heraldo de Madrid',
        'genero': 'Hombre', 'edad': 32,
        'residencia': 'Calle del Pez, Madrid',
        'nacimiento': 'Madrid',
        'car': {'FUE': 50, 'CON': 60, 'TAM': 65, 'DES': 60, 'APA': 60, 'INT': 70, 'POD': 55, 'EDU': 75},
        'suerte': 50,
        'hab': {
            'Arte/Artesanía (Fotografía)': 45, 'Buscar libros': 60, 'Charlatanería': 55,
            'Conducir automóvil': 30, 'Crédito': 25, 'Descubrir': 55, 'Escuchar': 50, 'Esquivar': 30,
            'Historia': 40, 'Otras lenguas (Francés)': 30, 'Persuasión': 45, 'Psicología': 50,
        },
        'armas': [],
        'equipo': ['Cámara de cajón', 'Libreta y lápiz', 'Linterna eléctrica', 'Una petaca de coñac'],
        'descripcion': 'Bigote fino, sombrero ladeado y un lápiz siempre detrás de la oreja.',
        'ideologia': 'La verdad vende. Y si no vende, se adorna un poco.',
        'allegados': 'Su madre, que recorta y guarda todos sus artículos, incluso los que no firma.',
        'lugares': 'La redacción de El Heraldo a medianoche y la tertulia del café de Pombo.',
        'posesiones': 'Su cámara de cajón, comprada a plazos.',
        'rasgos': 'Encantador, oportunista e incapaz de dejar una pregunta sin hacer.',
        'trasfondo': 'Lengua rápida, sombrero ladeado y una libreta siempre a medio llenar. '
                     'Sueña con la exclusiva que le saque de la sección de sucesos.',
        'motivo': 'En 1918 escribió sobre la leyenda de Raimundita y no le publicaron una línea. Desde entonces '
                  'le pica la curiosidad. Don Arturo Villegas, redactor jefe de El Imparcial, no le perdona '
                  'una exclusiva que le quitó.',
    },
    {
        'slug': 'anselmo-rubio',
        'nombre': 'Anselmo Rubio',
        'ocupacion': 'Agente retirado del Cuerpo de Vigilancia',
        'genero': 'Hombre', 'edad': 52,
        'residencia': 'Calle de Ponzano, Chamberí',
        'nacimiento': 'Ávila',
        'car': {'FUE': 70, 'CON': 65, 'TAM': 75, 'DES': 55, 'APA': 45, 'INT': 60, 'POD': 50, 'EDU': 55},
        'suerte': 55,
        'hab': {
            'Armas de fuego (Arma corta)': 55, 'Cerrajería': 35, 'Combatir (Pelea)': 65, 'Crédito': 30,
            'Derecho': 35, 'Descubrir': 60, 'Escuchar': 50, 'Esquivar': 30, 'Intimidar': 55,
            'Psicología': 45, 'Sigilo': 35,
        },
        'armas': [
            ('Revólver S&W del 38', 55, '1D10', '15 m', '1 (3)', '6', '100'),
            ('Porra', 65, '1D6+BD', 'Contacto', '1', '—', '—'),
        ],
        'equipo': ['Revólver y 6 balas', 'Una caja de repuesto', 'Porra', 'Farol de aceite', 'Una palanca'],
        'descripcion': 'Grandullón, bigote gris, el abrigo raído; cojea un poco cuando llueve.',
        'ideologia': 'La ley es la ley, aunque a veces no alcance.',
        'allegados': 'Ceferino, el sereno de Cibeles, asturiano como su difunta mujer.',
        'lugares': 'La taberna de la calle del Almirante, donde desayuna con Ceferino al acabar el turno.',
        'posesiones': 'Su revólver de reglamento, que nunca devolvió.',
        'rasgos': 'Desconfiado y protector. Duerme mal.',
        'trasfondo': 'Grandullón, bigote gris y un abrigo que ha conocido tiempos mejores. '
                     'Dejó el Cuerpo con una pensión corta y muchas preguntas sin contestar.',
        'motivo': 'En 1912 participó en una operación policial de la que nunca habla; algunas noches todavía '
                  'se despierta oliendo a humo. Ceferino, el sereno de Cibeles, es amigo suyo de toda la vida, '
                  'y fue él quien le contó lo de la casa.',
    },
]
