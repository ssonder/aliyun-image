FROM registry.cn-hangzhou.aliyuncs.com/ssonder/scalabel:init

COPY scripts/install_go_packages.sh ./scripts/install_go_packages.sh
RUN sh scripts/install_go_packages.sh

CMD ['/opt/scalabel/bin/scalabel', '--config', '/opt/scalabel/data/config.yml']