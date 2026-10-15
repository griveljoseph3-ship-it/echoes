// Situazioni (Momenti) e Eventi Maggiori. Ogni testo usa lo Stato del Mondo tramite il contesto c.
// c.n(role) -> NPC, c.w -> vocabolario del lavoro, c.o -> desinenza del giocatore (o/a)

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

export const SITUATIONS = [
  { id: 'opera', w: 3, cool: 3, req: c => true,
    build: c => { const a = c.n('amico'); const nuovo = !c.st.flags.pieceDone;
      return { place: c.w.placeName,
        text: `${cap(c.w.placeName)} è ancora in disordine da ieri. ${nuovo ? `Sul banco c'è ${c.w.pieceNew}: non è finito, e lo sai. Ogni volta che ci torni sopra cambia forma, come se ti chiedesse di essere più coraggios${c.o}.` : `Dopo ${c.w.pieceNew}, ti aspettano tutti al varco: il prossimo ${c.w.piece} deve essere migliore, o almeno diverso.`} ${a ? `${a.name} passa, guarda, non dice niente. Con ${a.g === 'f' ? 'lei' : 'lui'} il silenzio è un giudizio.` : ''}`,
        choices: [
          { label: `Rischiare tutto su un'idea nuova`, tag: 'rischio', hint: 'rischio alto, possibile svolta',
            ok: { text: `Lavori senza guardare l'orologio. A un certo punto smetti di pensare e le mani fanno da sole. Quando ti fermi, quello che hai davanti ti sorprende: non sembra tuo, sembra vero.`, eff: { skill: 2, mood: 2 }, fact: `Hai trovato una strada nuova per ${c.w.craft}`, flag: 'pieceDone' },
            ko: { text: `L'idea era bella solo nella testa. Più ci lavori, più si sfalda. Alla fine butti via tutto e resti sedut${c.o} sul pavimento, con la polvere addosso.`, eff: { mood: -2, skill: 1 }, fail: `l'idea nuova per ${c.w.pieceNew} non ha funzionato` } },
          { label: `Rifinire quello che sai già fare`, tag: 'sicuro', hint: 'sicuro, meno memorabile',
            ok: { text: `È un lavoro onesto. Nessuno griderà al miracolo, ma niente si rompe, e alla fine della giornata hai qualcosa di solido tra le mani.`, eff: { skill: 1, res: 1 } },
            ko: { text: `Fai tutto bene, eppure è come apparecchiare per un ospite che non viene. Il ${c.w.piece} è giusto, e proprio per questo non dice niente.`, eff: { mood: -1, res: 1 } } },
          ...(a ? [{ label: `Chiedere a ${a.name} cosa ne pensa davvero`, tag: 'relazione', hint: 'relazionale', npc: 'amico',
            ok: { text: `${a.name} ci pensa a lungo. Poi indica un punto preciso: "Lì. Lì sei tu. Il resto è paura." Ha ragione, ed è insopportabile.`, eff: { rel: { amico: 2 }, skill: 1 }, mem: { amico: `ti ha detto la verità sul tuo ${c.w.piece}` } },
            ko: { text: `${a.name} dice "è bello" troppo in fretta. Capite tutti e due che non è vero, e nessuno dei due lo dice.`, eff: { rel: { amico: -1 }, mood: -1 }, mem: { amico: `ti ha mentito per gentilezza, e tu te ne sei accort${c.o}` } } }] : []),
        ] }; } },

  { id: 'critico', w: 5, cool: 99, req: c => c.n('critico') && c.st.moments.length >= 2 && !c.st.flags.criticVisit,
    build: c => { const k = c.n('critico'); const met = c.st.promises.find(p => p.by === k.id && p.status === 'aperta');
      return { place: c.w.placeName, npcs: [k.id],
        text: `Oggi arriva ${k.name}. ${cap(k.job)}: ${k.story}. ${met ? `Ti aveva promesso di ${met.text}, e a quanto pare le promesse le mantiene.` : ''} ${c.st.flags.pieceDone ? `Hai pronto ${c.w.pieceNew}, quello di cui sei più fier${c.o}.` : `${cap(c.w.pieceNew)} non è ancora come vorresti.`} Senti il cuore battere in un punto strano, più in basso del solito.`,
        onShow: 'criticVisit', keepPromiseOf: 'critico',
        choices: [
          { label: `Mostrare ${c.w.pieceNew}`, tag: 'rischio', hint: 'rischio alto, possibile riconoscimento', bonus: c.st.flags.pieceDone ? 2 : -1,
            ok: { text: `${k.name} resta in silenzio molto più del necessario. Poi chiede: "Chi te l'ha insegnato?" Rispondi: "Nessuno." È la prima volta che lo dici con orgoglio. Prima di andare, ti stringe la mano due volte.`, eff: { rel: { critico: 3 }, impact: 3, mood: 2, res: 1 }, mem: { critico: `è rimast${k.g === 'f' ? 'a' : 'o'} colpit${k.g === 'f' ? 'a' : 'o'} da ${c.w.pieceNew}` }, fact: `${k.name} ha visto ${c.w.pieceNew} e l'ha amato`, success: `${k.name} ha riconosciuto il tuo lavoro` },
            ko: { text: `${k.name} è gentile, ed è la cosa peggiore. "C'è qualcosa," dice, "ma non è ancora qui." Indica il petto. Quando se ne va, il posto sembra più grande e più vuoto.`, eff: { rel: { critico: 1 }, mood: -2 }, mem: { critico: `ha visto ${c.w.pieceNew} non ancora pronto` }, fail: `${k.name} non è stat${k.g === 'f' ? 'a' : 'o'} convint${k.g === 'f' ? 'a' : 'o'} da ${c.w.pieceNew}` } },
          { label: `Restare sul classico e curare ogni dettaglio`, tag: 'sicuro', hint: 'sicuro, meno memorabile',
            ok: { text: `Tutto fila. ${k.name} annota qualcosa, sorride per educazione, ringrazia. Sarà una riga gentile, da qualche parte. Non cambierà niente, ma niente si è rotto.`, eff: { rel: { critico: 1 }, res: 1 }, mem: { critico: `ha visto il tuo lavoro più prudente` } },
            ko: { text: `Fai tutto giusto, ma ${k.name} se ne accorge: "È perfetto. Perché me lo fai vedere?" Non sai cosa rispondere.`, eff: { mood: -1 }, mem: { critico: `ha pensato che ti nascondessi dietro il mestiere` } } },
          { label: `Sederti e raccontare a ${k.name} la storia di quello che fai`, tag: 'relazione', hint: 'relazionale', npc: 'critico',
            ok: { text: `Racconti da dove viene tutto: la scelta, ${c.st.divergenceShort}. ${k.name} ascolta senza scrivere. Alla fine dice: "Adesso lo vedo." Non hai mostrato niente, eppure ha visto tutto.`, eff: { rel: { critico: 3 }, mood: 2 }, mem: { critico: `conosce la storia della tua scelta` }, fact: `${k.name} conosce la storia della tua vita alternativa` },
            ko: { text: `Parli troppo, lo senti mentre succede. ${k.name} annuisce, guarda l'ora. Il racconto che ti sembrava la tua forza, detto ad alta voce, suona come una scusa.`, eff: { rel: { critico: -1 }, mood: -1 }, mem: { critico: `ti ha sentito giustificarti` } } },
        ] }; } },

  { id: 'aiuto', w: 3, cool: 4, req: c => c.n('amico'),
    build: c => { const a = c.n('amico'); const L = a.g === 'f' ? 'la' : 'lo';
      const need = c.pick([`un passaggio fino all'altra parte della città, subito`, `qualcuno che stia con ${a.g === 'f' ? 'lei' : 'lui'} stasera, senza fare domande`, `un prestito piccolo, "solo fino a venerdì"`, `una mano a sistemare un casino che non ha voluto spiegare`]);
      return { place: c.place(), npcs: [a.id],
        text: `${a.name} ti aspetta fuori, ${a.look}. Non è da ${a.g === 'f' ? 'lei' : 'lui'} chiedere: ${a.trait.say}. Eppure oggi chiede: ha bisogno di ${need}. Intorno, ${c.sense()}. Tu avevi altri piani.`,
        choices: [
          { label: `Lasciare tutto e aiutar${L}`, tag: 'relazione', hint: 'ti costa, ma conta', npc: 'amico',
            ok: { text: `Non chiedi niente. ${a.name} lo nota. A metà strada dice solo: "Me lo ricorderò." E capisci che è una promessa.`, eff: { rel: { amico: 3 }, res: -1, mood: 1 }, mem: { amico: `l'hai aiutat${a.g === 'f' ? 'a' : 'o'} senza chiedere perché` }, success: `sei stat${c.o} vicin${c.o} a ${a.name} quando serviva` },
            ko: { text: `Ci provi, ma arrivi tardi e il guaio è già successo. ${a.name} non ti dà la colpa. È peggio.`, eff: { rel: { amico: 1 }, res: -1, mood: -1 }, mem: { amico: `hai provato ad aiutarl${a.g === 'f' ? 'a' : 'o'}, arrivando tardi` } } },
          { label: `Promettere che domani ci sarai`, tag: 'sicuro', hint: 'una promessa resta', npc: 'amico',
            ok: { text: `"Domani," dici. ${a.name} ti guarda come si guarda una moneta prima di accettarla. "Va bene. Domani." La parola resta sospesa tra voi.`, eff: { rel: { amico: 0 } }, promise: { to: 'amico', text: `dar${a.g === 'f' ? 'le' : 'gli'} una mano con quella cosa`, due: 2 } },
            ko: { text: `"Domani," dici, e ${a.name} sorride storto: "Domani è il giorno preferito di chi dice di no." Ma accetta la promessa.`, eff: { rel: { amico: -1 } }, promise: { to: 'amico', text: `dar${a.g === 'f' ? 'le' : 'gli'} una mano, come avevi detto`, due: 2 } } },
          { label: `Dire di no, con sincerità`, tag: 'sé', hint: 'proteggi il tuo tempo',
            ok: { text: `Spieghi perché non puoi. ${a.name} ci mette un momento, poi annuisce: "Almeno non mi hai mentito." Non è un perdono, ma ci assomiglia.`, eff: { rel: { amico: -1 }, skill: 1 }, mem: { amico: `gli hai detto di no, ma con sincerità` } },
            ko: { text: `Il tuo no esce più duro di come l'avevi pensato. ${a.name} si gira e se ne va senza salutare.`, eff: { rel: { amico: -3 }, mood: -1 }, mem: { amico: `gli hai detto di no nel momento sbagliato` }, fail: `hai lasciato solo ${a.name} quando ti ha chiesto aiuto` } },
        ] }; } },

  { id: 'promessa', w: 50, cool: 0, req: c => c.duePromise(),
    build: c => { const p = c.duePromise(); const a = c.npc(p.to);
      return { place: c.place(), npcs: [a.id], promiseId: p.id,
        text: `Ti torna in mente all'improvviso: avevi promesso a ${a.name} di ${p.text}. Sono passati ${c.since(p.made)} momenti. ${a.name} non te l'ha più nominato, ed è così che sai che ci conta. ${c.sense(true)}.`,
        choices: [
          { label: `Mantenere la promessa, costi quel che costi`, tag: 'relazione', hint: 'promessa mantenuta', npc: a.role, auto: true,
            ok: { text: `Ci sei. Fai quello che avevi detto, senza teatro. ${a.name} non ringrazia: ti passa ${c.pick(['un caffè','una sigaretta che non fumi','metà del suo panino','la sua sciarpa'])}, e in quel gesto c'è tutto.`, eff: { rel: { [a.role]: 3 }, res: -1, mood: 2 }, keep: p.id, mem: { [a.role]: `hai mantenuto la promessa di ${p.text}` }, success: `hai mantenuto la promessa fatta a ${a.name}` },
            ko: { text: `Mantieni la promessa, ma ti costa più del previsto e si vede. ${a.name} lo nota: "Non dovevi, se era così pesante." Lo dice con affetto, ma resta un'ombra.`, eff: { rel: { [a.role]: 2 }, res: -2 }, keep: p.id, mem: { [a.role]: `hai mantenuto la promessa, con fatica` } } },
          { label: `Chiedere ancora un po' di tempo`, tag: 'sicuro', hint: 'rimandare ha un prezzo',
            ok: { text: `${a.name} sospira: "Va bene. Ma questa è l'ultima volta." La promessa resta lì, un po' più pesante.`, eff: { rel: { [a.role]: -1 } }, delay: p.id },
            ko: { text: `"Lo sapevo," dice ${a.name}, e non aggiunge altro. La promessa resta, ma qualcosa si è incrinato.`, eff: { rel: { [a.role]: -2 }, mood: -1 }, delay: p.id } },
          { label: `Ammettere che non puoi mantenerla`, tag: 'sé', hint: 'promessa rotta',
            ok: { text: `Lo dici guardandol${a.g === 'f' ? 'a' : 'o'} negli occhi. ${a.name} resta in silenzio, poi: "Grazie per non avermi fatto aspettare ancora." Fa male lo stesso.`, eff: { rel: { [a.role]: -2 } }, brk: p.id, mem: { [a.role]: `hai rotto una promessa, ma con onestà` } },
            ko: { text: `${a.name} ride, senza allegria. "Lo sapevo dal primo giorno." Esce, e la porta non sbatte: si chiude piano, che è peggio.`, eff: { rel: { [a.role]: -4 }, mood: -2 }, brk: p.id, mem: { [a.role]: `hai rotto la promessa di ${p.text}` }, fail: `hai rotto la promessa fatta a ${a.name}` } },
        ] }; } },

  { id: 'oggetto', w: 2, cool: 6, req: c => c.st.object && !c.st.object.gone,
    build: c => { const o = c.st.object; const l = c.n('lontano');
      return { place: c.home(),
        text: `Riordinando, ti ritrovi tra le mani ${o.name}: ${o.desc}. ${cap(c.ol())} tieni da ${c.st.day} giorni in questa vita, eppure pesa come il primo giorno. ${l && !l.gone ? `Pensi a ${l.name}. ${cap(l.job)}.` : ''}`,
        choices: [
          ...(l && !l.gone ? [{ label: `Far${c.ol()} arrivare a ${l.name}`, tag: 'rischio', hint: 'qualcosa si muoverà', npc: 'lontano',
            ok: { text: `${cap(c.ol())} spedisci prima di cambiare idea. Per giorni non succede niente. Poi, una sera, arriva una risposta di tre righe. La terza dice: "Anch'io."`, eff: { rel: { lontano: 3 }, mood: 2 }, objectGone: `l'hai mandat${c.oe()} a ${l.name}`, mem: { lontano: `ha ricevuto ${o.name}` }, fact: `${l.name} ha ricevuto ${o.name} e ha risposto`, success: `hai riaperto il filo con ${l.name}` },
            ko: { text: `${cap(c.ol())} spedisci. Nessuna risposta. Il silenzio è una risposta anche lui, e la conosci bene.`, eff: { rel: { lontano: -1 }, mood: -2 }, objectGone: `l'hai mandat${c.oe()} a ${l.name}, senza risposta`, mem: { lontano: `ha ricevuto ${o.name} e non ha risposto` }, fail: `${l.name} non ha risposto` } }] : []),
          { label: `Tener${c.ol()}, ancora per un po'`, tag: 'sicuro', hint: 'la memoria resta',
            ok: { text: `${cap(c.ol())} rimetti al suo posto. Non è codardia, ti dici: certe cose maturano al buio, come il pane.`, eff: { mood: 1 } },
            ko: { text: `${cap(c.ol())} rimetti al suo posto e ti senti pesante. Non tutto quello che si tiene si custodisce.`, eff: { mood: -1 } } },
          { label: `Lasciar${c.ol()} andare per sempre`, tag: 'sé', hint: 'irreversibile',
            ok: { text: `${cap(c.ol())} lasci andare: nel mare, nel fuoco, in un cassetto di qualcun altro. Ti aspettavi dolore. Arriva invece una leggerezza nuova, quasi imbarazzante.`, eff: { mood: 2, skill: 1 }, objectGone: `l'hai lasciat${c.oe()} andare` },
            ko: { text: `${cap(c.ol())} lasci andare e, un secondo dopo, vorresti riaver${c.ol()}. Non si può. Te ${c.ol()} porterai dietro proprio perché non c'è più.`, eff: { mood: -2 }, objectGone: `l'hai lasciat${c.oe()} andare, e te ne sei pentit${c.o}`, fail: `ti sei pentit${c.o} di aver lasciato andare ${o.name}` } },
        ] }; } },

  { id: 'lontano', w: 2, cool: 5, req: c => { const l = c.n('lontano'); return l && !l.gone; },
    build: c => { const l = c.n('lontano'); const r = l.rel;
      return { place: c.place(), npcs: [l.id],
        text: `Il telefono vibra mentre ${c.pick(['cammini','stai per mangiare','fissi il soffitto','stai finendo il turno'])}. È ${l.name}. ${r > 3 ? 'Ultimamente vi sentite più spesso, e ogni volta è una piccola festa nascosta.' : r < -2 ? 'Non vi parlate da tanto, e l\'ultima volta è finita male.' : 'Non vi sentite spesso.'} Il messaggio dice solo: "Pensavo a te. Come stai, davvero?" ${c.sense(true)}.`,
        choices: [
          { label: `Rispondere con la verità, tutta`, tag: 'rischio', hint: 'apertura', npc: 'lontano',
            ok: { text: `Scrivi a lungo. Cancelli, riscrivi, invii. La risposta arriva dopo un'ora: una foto della finestra di ${l.name}, con la stessa luce che vedi tu. "Allora non siamo così lontani."`, eff: { rel: { lontano: 3 }, mood: 2 }, mem: { lontano: `le hai detto come stai davvero`.replace('le ', l.g === 'f' ? 'le ' : 'gli ') } },
            ko: { text: `Invii tutto. Due spunte. Nessuna risposta per giorni. Poi un "ok, mi fa piacere." Ti chiedi se hai detto troppo.`, eff: { rel: { lontano: 1 }, mood: -1 }, mem: { lontano: `hai aperto il cuore e la risposta è stata breve` } } },
          { label: `Rispondere "tutto bene, e tu?"`, tag: 'sicuro', hint: 'distanza di sicurezza',
            ok: { text: `"Tutto bene, e tu?" ${l.name} risponde con un cuore. Un filo sottile, ma è ancora un filo.`, eff: { rel: { lontano: 1 } } },
            ko: { text: `"Tutto bene, e tu?" Nessuna risposta. Forse ${l.name} voleva altro, e l'ha capito anche dal punto interrogativo.`, eff: { rel: { lontano: -1 }, mood: -1 } } },
          { label: `Non rispondere, per ora`, tag: 'sé', hint: 'silenzio',
            ok: { text: `Metti il telefono a faccia in giù. Hai bisogno di essere qui, adesso, in questa vita. ${l.name} capirà. Forse.`, eff: { mood: 1, rel: { lontano: -1 } } },
            ko: { text: `Non rispondi, e il messaggio resta lì tutta la notte, come una luce accesa in un'altra stanza.`, eff: { mood: -1, rel: { lontano: -2 } }, mem: { lontano: `hai ignorato il suo messaggio` } } },
        ] }; } },

  { id: 'incontro', w: 2, cool: 5, req: c => c.st.npcs.filter(n => !n.gone).length < 6,
    build: c => { const n = c.newNpc();
      return { place: c.place(), newNpc: n,
        text: `A ${c.placeShort()} c'è una persona che non hai mai visto: ${n.name}, ${n.job}. ${cap(n.look)}. Ti chiede ${c.pick(['un\'indicazione','se il posto accanto è libero','che ore sono, anche se ha l\'orologio','se sei di qui'])}. ${c.sense(true)}. In un'altra vita non vi sareste mai incrociati.`,
        choices: [
          { label: `Offrir${n.g === 'f' ? 'le' : 'gli'} un caffè e ascoltare`, tag: 'relazione', hint: 'nuovo legame', npc: 'nuovo',
            ok: { text: `${n.name} parla, e tu ascolti. Scopri che ${n.story}. Quando vi salutate, avete un nome in più nella rubrica e un motivo per tornare qui.`, eff: { rel: { nuovo: 2 }, mood: 1 }, mem: { nuovo: `vi siete conosciuti a ${c.placeShort()} davanti a un caffè` }, fact: `Hai conosciuto ${n.name}, ${n.job}` },
            ko: { text: `Il caffè c'è, la conversazione no. ${n.name} è gentile ma altrove. Vi salutate con la promessa vaga di rivedervi.`, eff: { rel: { nuovo: 0 } }, mem: { nuovo: `vi siete conosciuti, con un po' di imbarazzo` }, fact: `Hai conosciuto ${n.name}, ${n.job}` } },
          { label: `Raccontar${n.g === 'f' ? 'le' : 'gli'} qualcosa di te`, tag: 'rischio', hint: 'esporsi', npc: 'nuovo',
            ok: { text: `Senza sapere perché, le racconti di ${c.st.divergenceShort}. ${n.name} non ride: "Io ho fatto il contrario," dice. Vi guardate come due specchi rotti che combaciano.`.replace('le racconti', n.g === 'f' ? 'le racconti' : 'gli racconti'), eff: { rel: { nuovo: 3 }, mood: 1 }, mem: { nuovo: `conosce la tua scelta` }, fact: `Hai conosciuto ${n.name}, ${n.job}` },
            ko: { text: `Parli troppo, troppo presto. ${n.name} sorride, ma fa un passo indietro.`, eff: { rel: { nuovo: -1 }, mood: -1 }, mem: { nuovo: `gli hai parlato troppo presto`.replace('gli', n.g === 'f' ? 'le' : 'gli') }, fact: `Hai conosciuto ${n.name}, ${n.job}` } },
          { label: `Rispondere con gentilezza e proseguire`, tag: 'sicuro', hint: 'resta uno sconosciuto',
            ok: { text: `Rispondi, sorridi, prosegui. Ma per tutto il giorno ti torna in mente ${n.name}, e quella frase che non hai detto.`, eff: { mood: 0 }, mem: { nuovo: `vi siete incrociati per un attimo` }, fact: `Hai incrociato ${n.name}` },
            ko: { text: `Prosegui. Quando ti volti, ${n.name} è già sparit${n.g === 'f' ? 'a' : 'o'}.`, eff: { mood: -1 }, mem: { nuovo: `vi siete incrociati per un attimo` }, fact: `Hai incrociato ${n.name}` } },
        ] }; } },

  { id: 'ritorno', w: 3, cool: 4, req: c => c.metNew(),
    build: c => { const n = c.metNew(); const m = n.memories[n.memories.length - 1];
      return { place: c.place(), npcs: [n.id],
        text: `Rivedi ${n.name}. Si ricorda di te: ${m ? 'l\'ultima volta ' + m.text : 'vi siete già visti'}. ${n.rel > 2 ? `Ti viene incontro come si va incontro a un amico.` : n.rel < 0 ? `C'è ancora un po' di imbarazzo tra voi.` : `Ti fa un cenno, incert${n.g === 'f' ? 'a' : 'o'}.`} Oggi ${n.g === 'f' ? 'lei' : 'lui'} ha qualcosa da chiederti: ${c.pick(['ti vuole presentare una persona','ha bisogno di un consiglio','vuole mostrarti un posto che conosce solo lei','vuole sapere se ti ricordi cosa ti aveva detto'.replace('lei', n.g === 'f' ? 'lei' : 'lui')])}.`,
        choices: [
          { label: `Dire di sì, senza esitare`, tag: 'relazione', hint: 'legame più forte', npc: n.role,
            ok: { text: `Vai. Scopri un pezzo di ${c.st.city} che non conoscevi, e un pezzo di ${n.name} che non mostra a nessuno. Tornando, ti accorgi che stai fischiettando.`, eff: { rel: { [n.role]: 3 }, mood: 2 }, mem: { [n.role]: `ti ha mostrato una parte di sé` }, success: `${n.name} si fida di te` },
            ko: { text: `Vai, ma qualcosa non scatta. Non è colpa di nessuno: certe porte si aprono solo a metà.`, eff: { rel: { [n.role]: 1 } }, mem: { [n.role]: `ci avete provato, con prudenza` } } },
          { label: `Chiedere prima di sapere di più`, tag: 'sicuro', hint: 'prudenza',
            ok: { text: `${n.name} apprezza la domanda. Ti spiega, e quello che dice ti fa capire chi è: ${n.trait.t}, una persona che ${n.trait.say}.`, eff: { rel: { [n.role]: 1 }, skill: 1 }, mem: { [n.role]: `gli hai fatto domande sincere`.replace('gli', n.g === 'f' ? 'le' : 'gli') } },
            ko: { text: `La tua domanda suona come una diffidenza. ${n.name} si chiude un po'.`, eff: { rel: { [n.role]: -1 } } } },
          { label: `Inventare una scusa`, tag: 'sé', hint: 'distanza',
            ok: { text: `"Un'altra volta." ${n.name} annuisce, e capisci che non ci sarà un'altra volta. Forse va bene così.`, eff: { rel: { [n.role]: -2 } } },
            ko: { text: `La scusa è debole e lo sapete entrambi. ${n.name} ti saluta con troppa cortesia.`, eff: { rel: { [n.role]: -2 }, mood: -1 }, mem: { [n.role]: `hai inventato una scusa per evitarl${n.g === 'f' ? 'a' : 'o'}` } } },
        ] }; } },

  { id: 'soldi', w: 2, cool: 5, req: c => true,
    build: c => { const a = c.n('amico'); const what = c.pick([`si è rotto qualcosa di importante in ${c.w.placeName}`, `l'affitto è aumentato senza preavviso`, `una spesa che avevi dimenticato bussa alla porta`]);
      return { place: c.w.placeName,
        text: `${cap(what)}. ${c.st.stats.res <= 0 ? 'E i soldi, in questa vita, non sono mai abbastanza.' : 'Hai qualcosa da parte, ma era per altro.'} Fai i conti tre volte, e tre volte tornano uguali.`,
        choices: [
          { label: `Pagare di tasca tua e stringere la cinghia`, tag: 'sicuro', hint: 'costa risorse',
            ok: { text: `Paghi. Per un mese ci saranno pasta e pazienza. Ma ${c.w.placeName} resta tuo, e questo conta più di tutto.`, eff: { res: -2, mood: 1 } },
            ko: { text: `Paghi, e il conto lascia un buco più grande del previsto. Dormi male.`, eff: { res: -3, mood: -1 } } },
          ...(a ? [{ label: `Chiedere aiuto a ${a.name}`, tag: 'relazione', hint: 'dipende da quanto vi fidate', npc: 'amico',
            ok: { text: `${a.name} non ti fa neanche finire la frase. "Ci mancherebbe. Tu l'avresti fatto per me." Ti chiedi se è vero, e speri di sì.`, eff: { rel: { amico: 1 }, res: 1 }, promise: { to: 'amico', text: `restituire a ${a.name} quello che ti ha prestato`, due: 4 } },
            ko: { text: `${a.name} abbassa gli occhi: non può. Ve ne vergognate tutti e due, per motivi diversi.`, eff: { rel: { amico: -1 }, mood: -1 } } }] : []),
          { label: `Accettare un lavoretto extra, rischioso e mal pagato`, tag: 'rischio', hint: 'rischio',
            ok: { text: `Tre notti di fatica in un posto che non c'entra niente con te. Ma ne esci con i soldi e con una storia da raccontare.`, eff: { res: 2, mood: -1, skill: 1 } },
            ko: { text: `Il lavoretto va storto: ti pagano metà, e ci perdi il sonno e un pezzo di orgoglio.`, eff: { res: 0, mood: -2 }, fail: `il lavoretto extra è andato storto` } },
        ] }; } },

  { id: 'notte', w: 2, cool: 4, req: c => true,
    build: c => ({ place: c.home(), forcePart: 'notte',
      text: `Non riesci a dormire. Dalla finestra, ${c.sense()}. Pensi alla vita che non hai scelto, quella dove stanotte dormi tranquill${c.o}. ${c.lastFail() ? `E pensi a quando ${c.lastFail()}.` : 'Ti chiedi se sei felice o solo occupat' + c.o + '.'}`,
      choices: [
        { label: `Scrivere tutto su un foglio`, tag: 'sé', hint: 'introspezione',
          ok: { text: `Scrivi finché la mano fa male. Alla fine c'è una frase sola che vale la pena tenere, e la sottolinei due volte. Ti addormenti con la penna in mano.`, eff: { mood: 2, skill: 1 }, fact: 'Hai cominciato a scrivere di notte' },
          ko: { text: `Scrivi, cancelli, riscrivi. Le parole sembrano di qualcun altro. All'alba il foglio è pieno e tu sei vuot${c.o}.`, eff: { mood: -1 } } },
        { label: `Uscire a camminare fino a ${c.placeShort(true)}`, tag: 'rischio', hint: 'la notte porta incontri',
          ok: { text: `La città di notte è un'altra città. A ${c.lastPlace} ti siedi e, per la prima volta, ti senti a casa in questa vita.`, eff: { mood: 2 } },
          ko: { text: `Cammini e cammini, ma i pensieri ti seguono passo per passo. Torni con i piedi freddi e le stesse domande.`, eff: { mood: -1 } } },
        { label: `Chiamare qualcuno anche se è tardi`, tag: 'relazione', hint: 'chi risponderà?', npc: c.bestFriendRole(),
          ok: { text: `Risponde ${c.bestFriendName()}, con la voce impastata: "Che succede?" "Niente," dici. "Volevo sentire una voce." E restate al telefono senza parlare, per un po'.`, eff: { mood: 2, rel: { [c.bestFriendRole()]: 2 } }, mem: { [c.bestFriendRole()]: `ti ha risposto alle tre di notte` } },
          ko: { text: `Squilla a vuoto. Il telefono, al buio, illumina solo la tua faccia.`, eff: { mood: -1 } } },
      ] }) },

  { id: 'fallimento', w: 3, cool: 6, req: c => c.lastFail(),
    build: c => { const f = c.lastFail();
      return { place: c.w.placeName,
        text: `Non te lo sei tolto dalla testa: ${f}. Oggi, mentre ${c.pick(['sistemi le cose','guardi fuori','aspetti che passi la pioggia','lavi le mani'])}, capisci che puoi scegliere che cosa diventa quel ricordo: una ferita o un inizio. ${c.sense(true)}.`,
        choices: [
          { label: `Riprovarci in un modo completamente diverso`, tag: 'rischio', hint: 'seconda possibilità',
            ok: { text: `Questa volta parti dalla fine, dal punto in cui ti eri arenat${c.o}. E funziona. Non è una vittoria: è una pace.`, eff: { skill: 2, mood: 2 }, clearFail: true, success: `hai trasformato un fallimento in un inizio` },
            ko: { text: `Fallisci di nuovo, ma meglio. Lo senti: stai imparando la forma esatta del tuo limite.`, eff: { skill: 1, mood: -1 } } },
          { label: `Accettarlo e andare avanti`, tag: 'sé', hint: 'lasciar andare',
            ok: { text: `Lo dici ad alta voce, da sol${c.o}: "È andata così." Le parole fanno meno male del silenzio che c'era prima.`, eff: { mood: 1 }, clearFail: true },
            ko: { text: `Ci provi, ad accettarlo. Ma ti accorgi che stai solo smettendo di guardarlo.`, eff: { mood: -1 } } },
          { label: `Parlarne con ${c.bestFriendName()}`, tag: 'relazione', hint: 'condividere', npc: c.bestFriendRole(),
            ok: { text: `${c.bestFriendName()} ascolta e poi ride, ma nel modo giusto: "Sai quante volte ho sbagliato io?" Ti racconta una storia che non sapevi. Il tuo fallimento diventa più piccolo.`, eff: { rel: { [c.bestFriendRole()]: 2 }, mood: 1 }, clearFail: true, mem: { [c.bestFriendRole()]: `vi siete raccontati i vostri fallimenti` } },
            ko: { text: `${c.bestFriendName()} ti dà consigli che non hai chiesto. Annuisci per gentilezza.`, eff: { mood: -1 } } },
        ] }; } },

  { id: 'gioia', w: 2, cool: 4, req: c => true,
    build: c => { const g = c.pick([`un bambino insegna a un vecchio un gioco con le mani`, `qualcuno ha scritto col gesso "oggi è un buon giorno" su un muro`, `una finestra di fronte si apre e qualcuno comincia a suonare, male e con gioia`, `il cielo fa una cosa che non hai mai visto, un colore che non ha nome`]);
      return { place: c.place(),
        text: `Ti fermi all'improvviso: ${g}. Nessuno se ne accorge tranne te. Pensi che nella tua vita vera non avresti alzato gli occhi.`,
        choices: [
          { label: `Raccontarlo a ${c.bestFriendName()}`, tag: 'relazione', hint: 'condividere', npc: c.bestFriendRole(),
            ok: { text: `Lo racconti male, ridendo. ${c.bestFriendName()} non capisce del tutto, ma capisce te. Basta.`, eff: { rel: { [c.bestFriendRole()]: 1 }, mood: 2 } },
            ko: { text: `"E quindi?" chiede ${c.bestFriendName()}. Certe cose non si traducono.`, eff: { mood: 0 } } },
          { label: `Tenerlo per te, come un segreto`, tag: 'sé', hint: 'custodire',
            ok: { text: `Lo tieni stretto. Sarà tuo per sempre, uno di quei ricordi minuscoli che reggono il peso di intere stagioni.`, eff: { mood: 2 }, fact: `Custodisci un piccolo ricordo felice: ${g}` },
            ko: { text: `Lo tieni per te, e già la sera non ricordi bene com'era. La felicità è fatta così.`, eff: { mood: 1 } } },
          { label: `Trasformarlo in ${c.w.piece === 'lavoro' ? 'qualcosa' : 'un ' + c.w.piece}`, tag: 'rischio', hint: 'creare',
            ok: { text: `Corri a ${c.w.placeName} e cominci subito. Non sai dove ti porterà, ma per un'ora sei felice nel modo più semplice.`, eff: { skill: 2, mood: 1 } },
            ko: { text: `Ci provi, ma quel momento non entra in nessuna forma. Va bene: era fatto per essere vissuto, non usato.`, eff: { mood: 0 } } },
        ] }; } },

  { id: 'consiglio', w: 2, cool: 6, req: c => c.n('critico') && c.st.flags.criticVisit,
    build: c => { const k = c.n('critico');
      return { place: c.place(), npcs: [k.id],
        text: `${k.name} ti scrive: vuole vederti. Vi incontrate a ${c.placeShort()}. ${k.rel > 3 ? 'Ormai vi date del tu senza accorgervene.' : 'C\'è ancora una distanza formale tra voi.'} ${k.memories.length ? `Si ricorda bene che ${k.memories[k.memories.length - 1].text}.` : ''} Poi va dritt${k.g === 'f' ? 'a' : 'o'} al punto: "Ti devo dire una cosa che non ti piacerà."`,
        choices: [
          { label: `"Dimmela."`, tag: 'rischio', hint: 'verità scomoda', npc: 'critico',
            ok: { text: `Te la dice. Ha ragione su tutto, ed è la cosa più utile che ti abbiano mai detto. Torni a ${c.w.placeName} con il fuoco addosso.`, eff: { skill: 2, rel: { critico: 2 } }, mem: { critico: `ti ha detto una verità scomoda e tu l'hai ascoltata` } },
            ko: { text: `Te la dice. Ti brucia per tutta la giornata, e un po' anche il giorno dopo.`, eff: { skill: 1, mood: -2 }, mem: { critico: `ti ha ferito con una verità` } } },
          { label: `Chiedere perché ci tiene tanto`, tag: 'relazione', hint: 'scoprire chi è', npc: 'critico',
            ok: { text: `${k.name} esita, poi racconta: ${k.story}. "Non voglio che ti succeda la stessa cosa." Adesso sai perché ${k.g === 'f' ? 'lei' : 'lui'} ${k.trait.say}.`, eff: { rel: { critico: 3 } }, fact: `Conosci il segreto di ${k.name}: ${k.story}`, mem: { critico: `ti ha raccontato il suo passato` } },
            ko: { text: `"Non è questo il punto," taglia corto. Ma per un attimo hai visto una crepa.`, eff: { rel: { critico: 0 } } } },
          { label: `Difendere le tue scelte`, tag: 'sé', hint: 'orgoglio',
            ok: { text: `Ti difendi, con calma. ${k.name} sorride: "Bene. Era quello che volevo sentire."`, eff: { mood: 2, rel: { critico: 1 } } },
            ko: { text: `Ti difendi troppo forte. ${k.name} alza le mani: "Come vuoi." E cambia discorso.`, eff: { rel: { critico: -2 } }, mem: { critico: `non hai voluto ascoltarl${k.g === 'f' ? 'a' : 'o'}` } } },
        ] }; } },
];

// Eventi Maggiori (Passo 6): scelta etica, gestione risorse, puzzle narrativo, crocevia
export const MAJORS = [
  { id: 'dilemma', kind: 'etica', req: c => c.n('amico') && c.n('critico'),
    build: c => { const a = c.n('amico'), k = c.n('critico');
      return { title: 'Una scelta che pesa',
        text: `Lo scopri per caso: ${a.name} ha fatto una cosa alle tue spalle. Per aiutarti, dice, ha ${c.pick(['mentito a ' + k.name + ' su di te', 'preso un impegno a nome tuo con ' + k.name, 'raccontato a ' + k.name + ' un segreto che era tuo'])}. ${k.name} non sa che è successo alle tue spalle. Se lo scoprisse, perderesti la sua fiducia. Se lo dici tu, rischi di perdere ${a.name}.`,
        choices: [
          { label: `Dire la verità a ${k.name}`, tag: 'etica', hint: 'onestà, a un prezzo',
            res: { text: `Vai da ${k.name} e racconti tutto. Rispetta la tua onestà, ma ${a.name} non ti parla per giorni. Quando torna, ti dice: "Avevi ragione. Mi dà fastidio che tu avessi ragione."`, eff: { rel: { critico: 3, amico: -2 }, impact: 2 }, fact: `Hai scelto la verità invece di proteggere ${a.name}`, mem: { amico: `l'hai "tradito" per dire la verità`, critico: `ti ha visto scegliere l'onestà` } } },
          { label: `Proteggere ${a.name} e tacere`, tag: 'etica', hint: 'lealtà, con un segreto',
            res: { text: `Taci. ${a.name} lo sa e ti abbraccia forte, troppo forte. Ora avete un segreto in comune, e i segreti in comune legano e pesano allo stesso modo.`, eff: { rel: { amico: 3 }, mood: -1 }, fact: `Custodisci il segreto di ${a.name} con ${k.name}`, mem: { amico: `hai tenuto il suo segreto` }, flag: 'secret' } },
          { label: `Convincere ${a.name} a dirlo lui stesso`.replace('lui', a.g === 'f' ? 'lei' : 'lui'), tag: 'etica', hint: 'la via difficile',
            res: { text: `Ci vuole una notte intera. Alla fine ${a.name} va da ${k.name} da sol${a.g === 'f' ? 'a' : 'o'}. Non sai cosa si dicono. Ma il giorno dopo vi guardate tutti e tre in modo nuovo.`, eff: { rel: { amico: 2, critico: 2 }, mood: 1, impact: 1 }, fact: `${a.name} ha confessato a ${k.name}, grazie a te` } },
        ] }; } },
  { id: 'risorse', kind: 'risorse', req: c => true,
    build: c => { const a = c.n('amico') || c.n('lontano');
      return { title: 'Una settimana sola',
        text: `Questa settimana è stretta come una porta. Hai sette giorni e tre cose che li vogliono tutti: ${c.w.placeName}, ${a ? a.name : 'le persone che ami'}, e te stess${c.o}. Distribuisci i giorni: ogni scelta toglie qualcosa a un'altra.`,
        alloc: { total: 7, keys: [ { k: 'lavoro', label: cap(c.w.placeName.replace(/^(il|lo|la|l')\s?/, '')) }, { k: 'persone', label: a ? a.name : 'Le persone' }, { k: 'te', label: 'Te stess' + c.o } ] },
        resolve: (alloc) => { const out = []; const eff = { rel: {} };
          if (alloc.lavoro >= 4) { out.push(`Il lavoro fa un salto in avanti: ${c.w.placeName} non è mai stato così vivo.`); eff.skill = 2; eff.res = 2; eff.impact = 1; } else if (alloc.lavoro <= 1) { out.push(`Il lavoro resta indietro, e lo senti come un rumore di fondo.`); eff.res = -1; } else { out.push(`Il lavoro procede, a passo d'uomo.`); eff.skill = 1; }
          if (a) { if (alloc.persone >= 3) { out.push(`${a.name} se ne accorge: "Ci sei, questa settimana." È il complimento più bello.`); eff.rel[a.role] = 3; } else if (alloc.persone === 0) { out.push(`${a.name} smette di chiamare a metà settimana.`); eff.rel[a.role] = -3; } else { eff.rel[a.role] = 0; out.push(`Con ${a.name} vi incrociate, di corsa.`); } }
          if (alloc.te >= 2) { out.push(`E tu, per una volta, ti sei concess${c.o} di respirare.`); eff.mood = 2; } else { out.push(`E tu arrivi a domenica svuotat${c.o}.`); eff.mood = -2; }
          return { text: out.join(' '), eff, fact: `Hai dato ${alloc.lavoro} giorni al lavoro, ${alloc.persone} alle persone e ${alloc.te} a te in una settimana difficile`, mem: a ? { [a.role]: alloc.persone >= 3 ? 'ci sei stat' + c.o + ' in una settimana difficile' : 'in una settimana difficile hai avuto poco tempo' } : null }; } }; } },
  { id: 'puzzle', kind: 'puzzle', req: c => true,
    build: c => { const l = c.n('lontano') || c.n('amico'); const who = l ? l.name : 'qualcuno';
      const frags = [ `"Il giorno che hai scelto, pioveva."`, `"Poi hai cominciato a ${c.w.craft}, e nessuno ci credeva."`, `"Oggi ${c.st.city} sa il tuo nome."`, `"E un giorno ${who} capirà perché."` ];
      return { title: 'Il ricordo spezzato',
        text: `Trovi un foglio strappato in quattro pezzi, con la tua calligrafia. Non ricordi di averlo scritto. Forse l'ha scritto l'altro te, quello della vita vera. Rimetti i frammenti nell'ordine giusto: dal primo all'ultimo giorno.`,
        puzzle: { pieces: frags },
        resolve: (ok) => ok
          ? { text: `I pezzi combaciano. Leggi la frase intera ad alta voce, e la stanza sembra trattenere il fiato. Ora sai che le due vite si scrivono a vicenda.`, eff: { mood: 3, impact: 1 }, fact: 'Hai ricomposto il ricordo spezzato delle due vite', echoBoost: true }
          : { text: `I pezzi non tornano. Forse non è ancora il momento di capirli. Li metti in una busta, e la busta in un cassetto.`, eff: { mood: 0 }, fact: 'Conservi un ricordo spezzato che non hai saputo ricomporre' } }; } },
  { id: 'crocevia', kind: 'crocevia', req: c => c.n('critico') && c.st.flags.criticVisit && !c.st.flags.crossroad,
    build: c => { const k = c.n('critico'), a = c.n('amico');
      const offer = k.rel >= 3 ? `un'occasione vera: ${k.name} ti propone un progetto importante, con il tuo nome sopra, che ti prenderà ogni sera per sei mesi` : `una proposta di ${k.name}: lavorare anche per qualcun altro, con uno stipendio sicuro e meno libertà`;
      return { title: 'Il crocevia',
        text: `Arriva ${offer}. È il tipo di occasione che, nella tua vita vera, ti avrebbe fatto tremare. Ma accettare vuol dire dare meno tempo a ${c.w.placeName}${a ? ` e a ${a.name}` : ''}. ${c.sense(true)}. Questa volta nessuno sceglierà per te.`,
        choices: [
          { label: 'Accettare', tag: 'crocevia', hint: 'la vita cambia direzione',
            res: { text: `Dici sì, con le mani che tremano. ${a ? `${a.name} ti guarda a lungo e dice: "Cambia pure. Ma non sparire."` : ''} La vita alternativa ha appena fatto un'altra deviazione.`, eff: { impact: 3, skill: 2, rel: a ? { amico: -1, critico: 2 } : { critico: 2 } }, fact: `Hai accettato la proposta di ${k.name}`, flag: 'crossroadYes', mem: a ? { amico: `hai scelto un'occasione che ti toglie tempo per ${a.g === 'f' ? 'lei' : 'lui'}` } : null } },
          { label: 'Rifiutare e restare', tag: 'crocevia', hint: 'radici',
            res: { text: `Dici no, e lo dici con calma. ${k.name} non capisce, ma rispetta. Quella sera ${c.w.placeName} ti sembra più tuo che mai.`, eff: { rel: a ? { amico: 3 } : {}, mood: 2 }, fact: `Hai rifiutato la proposta di ${k.name} per restare`, mem: a ? { amico: `sei rimast${c.o} per ${a.g === 'f' ? 'lei' : 'lui'}, anche` } : null } },
          { label: 'Trattare: alle tue condizioni', tag: 'crocevia', hint: 'rischio',
            res: { text: `Chiedi di farlo a modo tuo, con i tuoi tempi. ${k.name} ci pensa una notte e poi accetta, a metà. Avrai meno, ma sarà tutto tuo.`, eff: { impact: 2, res: 1 }, fact: `Hai trattato con ${k.name} e sei rimast${c.o} alle tue condizioni` } },
        ], onDone: 'crossroad' }; } },
];
