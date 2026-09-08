export default {
    data() {
        return {
            currentRoute: '',
            currentView: 'loading',

            reportLoaded: false,
            showCredits: false,

            info: {},
            events: [],
            monLookup: {},
            
            metaMons: [],
            metaTeams: [],

            showTeam: false,
            teamPlayers: [],

            sorts: {
                teams: { column: 'count', dir: 1 },
                mons: { column: 'count', dir: 1 },
            },
        }
    },
    computed: {
        currentProps() {
            if (!this.reportLoaded) {
                return {};
            }

            let route = (this.currentRoute || '/');
            let chunks = [];

            if (route != '/') {
                chunks = route.split('/');
            } else {
                chunks = [ 'report' ];
            }

            switch (chunks[0] || '') {
                case 'report':
                    this.currentView = 'report';
                    break;
            }

            switch (this.currentView) {
                case 'report':
                    return {
                        info: this.info,
                        events: this.events,
                        monLookup: this.monLookup,
                        metaMons: this.metaMons,
                        metaTeams: this.metaTeams,
                        showTeam: this.showTeam,
                    };
            }

            return {};
        }
    },
    methods: {
        init() {
            // main listener that lets us have nice looking urls
            window.addEventListener('click', (e) => {
                if (e.target && e.target.closest('a')) {
                    const anchor = e.target.closest('a');

                    if ('pass' in anchor.dataset && anchor.dataset.pass == 1) {
                        return;
                    }

                    if (e.metaKey || e.ctrlKey) {
                        return;
                    }

                    e.preventDefault();

                    const url = anchor.getAttribute('href');
                    history.pushState({ page: url }, null, url);

                    const chips = window.location.pathname.split('/');
                    this.setCurrentRoute(chips.slice(1).join('/'));
                }
            });

            // listen on back button events
            window.addEventListener('popstate', (e) => {
                if (e.state) {
                    const chips = e.state.page.split('/');
                    this.setCurrentRoute(chips.slice(1).join('/'));
                }
            });

            document.addEventListener("keydown", (e) => {
                if (event.key === 'Escape') {
                    if (this.showTeam) {
                        this.closePopup();
                    }
                }
            });

            // some init setup
            const chips = window.location.pathname.split('/');
            history.pushState({ page: window.location.pathname }, null, window.location.pathname);
            this.setCurrentRoute(chips.slice(1).join('/'));

            this.getReport();
        },

        setCurrentRoute(route) {
            if (!route.length) {
                route = 'home';
            }
            this.currentRoute = route;
        },

        getReport() {
            if (this.reportLoaded) {
                return;
            }

            fetch(`api/v1/report`, {
                method: "GET",
                headers: { "Content-type": "application/json" },
            }).then(r => {
                if (!r.ok) {
                }

                return r.json();
            }).then(d => {
                this.info = d.info;
                this.events = d.events;
                this.monLookup = d.lookup;

                for (let metaData of d.meta) {
                    switch (metaData.size) {
                        case 1:
                            this.metaMons = metaData;
                            break;
                        case 6:
                            this.metaTeams = metaData;
                            break;
                    }
                }

                this.metaTeams.data.forEach(m => {
                    m.cutRate = m.count / m.total;
                    m.winRate = m.wins / (m.losses + m.wins);
                });

                this.metaMons.data.forEach(m => {
                    m.cutRate = m.count / m.total;
                    m.winRate = m.wins / (m.losses + m.wins);
                });

                this.reportLoaded = true;
                this.currentView = 'report';
            });
        },

        getMonData(monCode) {
            if (!this.monLookup[monCode]) {
                console.log(`couldn't find ${monCode}`);
                return false;
            }

            return this.monLookup[monCode];
        },

        getSpritePos(monCode) {
            const mon = this.getMonData(monCode);
            if (!mon) {
                return "0px 0px";
            }

            return `-${mon.pos[0]}px -${mon.pos[1]}px`;
        },

        getPct(dec, precision) {
            if (isNaN(dec)) {
                return "-";
            }
            if (precision == undefined) {
                precision = 5;
            }
            return (dec * 100).toPrecision(dec >= 1 ? precision : dec < .1 ? precision - 2 : precision - 1).toLocaleString() + "%";
        },

        toggleCredits() {
            this.showCredits = !this.showCredits;
        },

        sortData(sortData, sortList) {
            let sortInfo = this.sorts.teams;

            const col = sortData.column;
            if (sortInfo.column == col) {
                sortInfo.dir *= -1;
            } else {
                sortInfo.column = col;
                sortInfo.dir = 1;
            }

            sortData.target.classList.add(
                sortInfo.dir < 0 ? 'up' : 'down'
            );

            sortList.data.sort((a, b) => {
                if (a[col] < b[col]) {
                    return sortInfo.dir;
                } else if (a[col] > b[col]) {
                    return -sortInfo.dir;
                }
                return 0;
            });
        },

        sortTeams(sortData) {
            this.sortData(sortData, this.metaTeams);
        },

        sortMons(sortData) {
            this.sortData(sortData, this.metaMons);
        },

        showTeamPopup(teamData) {
            this.teamPlayers = teamData.monData;

            this.teamPlayers.fullTeamString = []
            this.teamPlayers.mons.forEach((m) => {
                this.teamPlayers.fullTeamString.push(this.getMonData(m).name);
            });

            this.teamPlayers.fullTeamString = this.teamPlayers.fullTeamString.join(', ')

            this.showTeam = true;
        },

        closePopup() {
            this.showTeam = false;
        },
    },

    components: {
        'loading': {
            template: '#loading-template',
        },

        'report': {
            template: '#report-template',
            props: [
                'info',
                'events',
                'monLookup',
                'metaMons',
                'metaTeams',
                'showTeam',
            ],
            computed: {
                metaMonsData: function() {
                    const mid = Math.ceil(this.metaMons.data.length / 2);
                    return [
                        this.metaMons.data.slice(0, mid),
                        this.metaMons.data.slice(mid),
                    ];
                },
            },
            emits: [
                'sort-teams',
                'sort-mons',
                'show-team',
            ],
            methods: {
                getMonData(monCode) {
                    return this.$parent.getMonData(monCode);
                },
                getSpritePos(monCode) {
                    return this.$parent.getSpritePos(monCode);
                },
                getPct(dec, precision) {
                    return this.$parent.getPct(dec, precision);
                },
                resetTable(node) {
                    Array.from(node.parentNode.children).forEach(c => {
                        c.classList.remove('up', 'down');
                    });
                },
                sortTeams(e) {
                    this.resetTable(e.target);
                    this.$emit('sort-teams', { column: e.target.dataset.column, target: e.target });
                },
                sortMons(e) {
                    this.resetTable(e.target);
                    this.$emit('sort-mons', { column: e.target.dataset.column, target: e.target });
                },
                getSortedClass() {
                    return '';
                },
                showTeamPopup(monData) {
                    this.$emit('show-team', { monData: monData });
                },
            },
        },
    },
}
